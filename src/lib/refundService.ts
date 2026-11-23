import SuitOrder from "@/models/SuitOrder";
import SuitRefund from "@/models/SuitRefund";
import SuitReturn from "@/models/SuitReturn";
import { atomically, type AtomicCtx } from "@/lib/atomic";
import { nextSequence } from "@/lib/counters";
import { istYear } from "@/lib/dates";
import { rupeesToPaise } from "@/lib/money";
import { cleanText, isObjectId } from "@/lib/validation";
import { parseEventDate } from "@/lib/orderInput";
import type { AuthUser } from "@/lib/auth/permissions";

export class RefundError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
type Actor = Pick<AuthUser, "id" | "email">;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any;
const hist = (action: string, a: Actor, note = "") => ({ at: new Date(), action, byId: a.id, byEmail: a.email, note });
export const formatRefundId = (year: number, seq: number) => `SRF-${year}-${String(seq).padStart(4, "0")}`;

/**
 * Staff or Owner RECOMMEND a refund. Nothing is reserved or paid yet; it needs an Owner's approval (separate step).
 * Only paid orders can be refunded, and the amount can never exceed what is still refundable on the order.
 */
export async function recommendRefund(body: Record<string, unknown>, actor: Actor): Promise<Doc> {
  if (!isObjectId(body.orderId)) throw new RefundError(400, "Choose the order to refund.");
  const amountPaise = rupeesToPaise(body.amount);
  if (!amountPaise || amountPaise < 1) throw new RefundError(400, "Enter a refund amount greater than zero (max 2 decimals).");
  if (body.method !== "upi" && body.method !== "bank_transfer") throw new RefundError(400, "Refund method must be UPI or bank transfer.");
  const order = await SuitOrder.findById(body.orderId).lean<Doc>();
  if (!order) throw new RefundError(404, "Order not found");
  if (order.paymentStatus !== "paid") throw new RefundError(409, "Only orders whose payment was received can be refunded.");
  const remaining = order.totalPaise - (order.refundCommittedPaise ?? 0);
  if (amountPaise > remaining) throw new RefundError(400, `The refund exceeds the refundable amount on this order (remaining: ${remaining / 100}).`);

  let returnRef: unknown, returnId = "";
  if (body.returnId !== undefined && body.returnId !== null && body.returnId !== "") {
    if (!isObjectId(body.returnId)) throw new RefundError(400, "Invalid return.");
    const ret = await SuitReturn.findById(body.returnId).lean<Doc>();
    if (!ret || String(ret.orderRef) !== String(order._id)) throw new RefundError(400, "That return does not belong to this order.");
    if (ret.decision.status !== "approved") throw new RefundError(409, "The return must be approved before a refund is recommended.");
    returnRef = ret._id; returnId = ret.returnId;
  }
  const year = istYear();
  const refundId = formatRefundId(year, await nextSequence(`suit-refund-${year}`));
  const doc = await SuitRefund.create({
    refundId, orderRef: order._id, orderId: order.orderId, returnRef, returnId, amountPaise, method: body.method, notes: cleanText(body.notes, 1000),
    recommendedById: actor.id, recommendedByEmail: actor.email, history: [hist("recommended", actor, cleanText(body.notes, 500))],
  });
  return doc.toObject();
}

/** Owner-only steps. Each is a conditional update, so a double click or a concurrent request applies at most once. */
export async function refundOwnerAction(id: string, body: Record<string, unknown>, actor: Actor): Promise<Doc> {
  if (!isObjectId(id)) throw new RefundError(404, "Refund not found");
  const refund = await SuitRefund.findById(id).lean<Doc>();
  if (!refund) throw new RefundError(404, "Refund not found");
  const action = String(body.action ?? "");
  const note = cleanText(body.note, 500);
  const conflict = (m: string) => new RefundError(409, m);
  const fresh = async () => (await SuitRefund.findById(id).lean<Doc>()) as Doc;
  // Re-read AFTER the transaction commits (reading inside it without the session would return the old state).
  const inTx = async (work: (ctx: AtomicCtx) => Promise<unknown>) => { await atomically(work); return fresh(); };

  switch (action) {
    case "approve": {
      // Authorise an amount (defaults to the recommended one) and reserve it against the order's refundable balance.
      let amount = refund.amountPaise as number;
      if (body.amount !== undefined && body.amount !== null && body.amount !== "") {
        const a = rupeesToPaise(body.amount);
        if (!a || a < 1) throw new RefundError(400, "Authorised amount must be greater than zero (max 2 decimals).");
        amount = a;
      }
      const order = await SuitOrder.findById(refund.orderRef).lean<Doc>();
      if (!order) throw new RefundError(404, "Order not found");
      if (order.paymentStatus !== "paid") throw conflict("Only orders whose payment was received can be refunded.");
      return inTx(async (ctx) => {
        const session = ctx.session ?? undefined;
        const before = await SuitRefund.findOneAndUpdate(
          { _id: id, "approval.status": "recommended" },
          { $set: { "approval.status": "approved", "approval.byId": actor.id, "approval.byEmail": actor.email, "approval.at": new Date(), "approval.note": note, amountPaise: amount, reserved: true, status: "pending" }, $push: { history: hist("approved", actor, `${amount / 100}${note ? ` — ${note}` : ""}`) } },
          { session, returnDocument: "before" },
        ).lean<Doc>();
        if (!before) throw conflict("This refund has already been approved or rejected.");
        ctx.onUndo(async () => { await SuitRefund.updateOne({ _id: id }, { $set: { "approval.status": "recommended", reserved: false, amountPaise: refund.amountPaise }, $pop: { history: 1 } }); });
        // The cap is enforced by the database: the increment only applies while committed + amount <= order total.
        const res = await SuitOrder.updateOne({ _id: refund.orderRef, refundCommittedPaise: { $lte: order.totalPaise - amount } }, { $inc: { refundCommittedPaise: amount } }, { session });
        if (res.modifiedCount !== 1) throw conflict("That amount exceeds what is still refundable on this order.");
        ctx.onUndo(async () => { await SuitOrder.updateOne({ _id: refund.orderRef }, { $inc: { refundCommittedPaise: -amount } }); });
      });
    }
    case "reject": {
      if (note.length < 3) throw new RefundError(400, "Please give a reason for rejecting the refund.");
      const r = await SuitRefund.findOneAndUpdate({ _id: id, "approval.status": "recommended" }, { $set: { "approval.status": "rejected", "approval.byId": actor.id, "approval.byEmail": actor.email, "approval.at": new Date(), "approval.note": note }, $push: { history: hist("rejected", actor, note) } }, { returnDocument: "after" }).lean<Doc>();
      if (!r) throw conflict("This refund has already been approved or rejected.");
      return r;
    }
    case "process": {
      const r = await SuitRefund.findOneAndUpdate({ _id: id, "approval.status": "approved", status: "pending" }, { $set: { status: "processing" }, $push: { history: hist("processing", actor, note) } }, { returnDocument: "after" }).lean<Doc>();
      if (!r) throw conflict("Only an approved, pending refund can be moved to processing.");
      return r;
    }
    case "complete": {
      const utr = cleanText(body.utr, 60);
      if (!/^[A-Za-z0-9\-_/]{6,60}$/.test(utr)) throw new RefundError(400, "Enter the transaction reference / UTR (6-60 letters or digits).");
      const date = parseEventDate(body.refundDate);
      if (date === null) throw new RefundError(400, "Refund date is not valid.");
      const r = await SuitRefund.findOneAndUpdate(
        { _id: id, "approval.status": "approved", status: { $in: ["pending", "processing"] } },
        { $set: { status: "completed", utr, refundDate: date ?? new Date(), notes: note || refund.notes }, $push: { history: hist("completed", actor, utr) } },
        { returnDocument: "after" },
      ).lean<Doc>();
      if (!r) throw conflict("This refund is not awaiting payment (it may already be completed or failed).");
      return r;
    }
    case "fail": {
      if (note.length < 3) throw new RefundError(400, "Please describe why the payment failed.");
      return inTx(async (ctx) => {
        const session = ctx.session ?? undefined;
        const before = await SuitRefund.findOneAndUpdate(
          { _id: id, "approval.status": "approved", status: { $in: ["pending", "processing"] }, reserved: true },
          { $set: { status: "failed", reserved: false, notes: note }, $push: { history: hist("failed", actor, note) } },
          { session, returnDocument: "before" },
        ).lean<Doc>();
        if (!before) throw conflict("Only an approved refund that has not been completed can be marked failed.");
        ctx.onUndo(async () => { await SuitRefund.updateOne({ _id: id }, { $set: { status: before.status, reserved: true }, $pop: { history: 1 } }); });
        await SuitOrder.updateOne({ _id: refund.orderRef }, { $inc: { refundCommittedPaise: -before.amountPaise } }, { session }); // release the reserved amount
        ctx.onUndo(async () => { await SuitOrder.updateOne({ _id: refund.orderRef }, { $inc: { refundCommittedPaise: before.amountPaise } }); });
      });
    }
    default:
      throw new RefundError(400, "Unknown action.");
  }
}

export function serializeRefund(r: Doc) {
  return {
    id: String(r._id), refundId: r.refundId, orderRef: String(r.orderRef), orderId: r.orderId, returnId: r.returnId || "",
    amountPaise: r.amountPaise, method: r.method, approval: r.approval, status: r.status, utr: r.utr, refundDate: r.refundDate, notes: r.notes,
    reserved: r.reserved, history: r.history, recommendedByEmail: r.recommendedByEmail, createdAt: r.createdAt,
  };
}
