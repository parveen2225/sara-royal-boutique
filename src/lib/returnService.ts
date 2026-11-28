import UnstitchedSuit from "@/models/UnstitchedSuit";
import SuitOrder from "@/models/SuitOrder";
import SuitReturn, { RETURN_WINDOW_DAYS } from "@/models/SuitReturn";
import StockMovement from "@/models/StockMovement";
import { atomically, type AtomicCtx } from "@/lib/atomic";
import { nextSequence } from "@/lib/counters";
import { istYear, ymdIst } from "@/lib/dates";
import { cleanText, isObjectId } from "@/lib/validation";
import { daysBetweenYmd, parsePhotos, type ReturnInput } from "@/lib/returnInput";
import { parseCourier } from "@/lib/orderInput";
import type { AuthUser } from "@/lib/auth/permissions";
import { findVariant, hasVariants, restoreTarget, stockIncOp, trackedQty, trackedSku } from "@/lib/variantStock";
import { Types } from "mongoose";

export class ReturnError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
type Actor = AuthUser;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any;
const hist = (action: string, a: Pick<Actor, "id" | "email">, note = "") => ({ at: new Date(), action, byId: a.id, byEmail: a.email, note });
export const formatReturnId = (year: number, seq: number) => `SRR-${year}-${String(seq).padStart(4, "0")}`;

/** An order line is one suit + (optional) variant; lines without a variant have none stored (matched by null). */
const lineKey = (suitId: unknown, variantId?: unknown) => `${String(suitId)}:${variantId ? String(variantId) : ""}`;
const lineMatch = (suitId: unknown, variantId?: unknown) => ({ suitId: new Types.ObjectId(String(suitId)), variantId: variantId ? new Types.ObjectId(String(variantId)) : null });
const lineFilter = (suitId: unknown, variantId?: unknown) => { const m = lineMatch(suitId, variantId); return { "el.suitId": m.suitId, "el.variantId": m.variantId }; };

async function reserve(ctx: AtomicCtx, orderRef: string, lineQty: number, suitId: string, variantId: string | undefined, qty: number) {
  const res = await SuitOrder.updateOne(
    { _id: orderRef, items: { $elemMatch: { ...lineMatch(suitId, variantId), returnedQuantity: { $lte: lineQty - qty } } } },
    { $inc: { "items.$[el].returnedQuantity": qty } },
    { session: ctx.session ?? undefined, arrayFilters: [lineFilter(suitId, variantId)] },
  );
  if (res.modifiedCount !== 1) throw new ReturnError(409, "More units are being returned than were ordered (including other return requests).");
  ctx.onUndo(async () => { await SuitOrder.updateOne({ _id: orderRef }, { $inc: { "items.$[el].returnedQuantity": -qty } }, { arrayFilters: [lineFilter(suitId, variantId)] }); });
}
async function release(ctx: AtomicCtx, orderRef: string, items: { suitId: unknown; variantId?: unknown; quantity: number }[]) {
  for (const i of items) {
    await SuitOrder.updateOne({ _id: orderRef }, { $inc: { "items.$[el].returnedQuantity": -i.quantity } }, { session: ctx.session ?? undefined, arrayFilters: [lineFilter(i.suitId, i.variantId)] });
    ctx.onUndo(async () => { await SuitOrder.updateOne({ _id: orderRef }, { $inc: { "items.$[el].returnedQuantity": i.quantity } }, { arrayFilters: [lineFilter(i.suitId, i.variantId)] }); });
  }
}

export async function createReturn(input: ReturnInput, actor: Actor): Promise<Doc> {
  const order = await SuitOrder.findById(input.orderRef).lean<Doc>();
  if (!order) throw new ReturnError(404, "Order not found");
  if (order.status !== "delivered" || !order.deliveredAt) throw new ReturnError(409, "A return can only be recorded for a delivered order.");
  const requestedAt = input.requestedAt ?? new Date();
  const days = daysBetweenYmd(ymdIst(order.deliveredAt), ymdIst(requestedAt));
  if (days < 0) throw new ReturnError(400, "The request date cannot be before the delivery date.");
  const withinWindow = days <= RETURN_WINDOW_DAYS;
  if (!withinWindow && input.exceptionNote.length < 5) throw new ReturnError(400, `This request is ${days} days after delivery (standard window: ${RETURN_WINDOW_DAYS} days). Add a note explaining why you are accepting it as an exception.`);

  const lines = new Map<string, Doc>((order.items as Doc[]).map((l) => [lineKey(l.suitId, l.variantId), l]));
  const lineOf = (it: { suitId: string; variantId?: string }) => lines.get(lineKey(it.suitId, it.variantId));
  for (const it of input.items) {
    const line = lineOf(it);
    if (!line) throw new ReturnError(400, "A selected suit is not part of this order.");
    const remaining = line.quantity - (line.returnedQuantity ?? 0);
    if (it.quantity > remaining) throw new ReturnError(409, `Only ${remaining} unit(s) of ${line.sku} can still be returned.`);
  }
  const year = istYear();
  const returnId = formatReturnId(year, await nextSequence(`suit-return-${year}`));
  const paidBy = input.reasonType === "preference" ? "customer" : "boutique";

  return atomically(async (ctx) => {
    for (const it of input.items) await reserve(ctx, input.orderRef, lineOf(it).quantity, it.suitId, it.variantId, it.quantity);
    const [created] = await SuitReturn.create([{
      returnId, orderRef: order._id, orderId: order.orderId, type: input.type, reasonType: input.reasonType, reasonNote: input.reasonNote,
      unusedUncutConfirmed: input.unusedUncutConfirmed,
      items: input.items.map((it) => { const l = lineOf(it); return { suitId: l.suitId, ...(l.variantId ? { variantId: l.variantId } : {}), sku: l.sku, name: l.name, quantity: it.quantity, unitPricePaise: l.unitPricePaise }; }),
      photos: input.photos, requestedAt, deliveredAtSnapshot: order.deliveredAt, withinWindow, exceptionNote: input.exceptionNote,
      returnShipping: { paidBy }, history: [hist("requested", actor, input.reasonNote)], createdById: actor.id, createdByEmail: actor.email,
    }], { session: ctx.session ?? undefined });
    return created.toObject();
  });
}

const rid = (id: string) => (isObjectId(id) ? id : null);

/** One entry point for every state change on a return. Each step uses a conditional update, so it can only apply once. */
export async function returnAction(id: string, body: Record<string, unknown>, actor: Actor): Promise<Doc> {
  if (!rid(id)) throw new ReturnError(404, "Return not found");
  const ret = await SuitReturn.findById(id).lean<Doc>();
  if (!ret) throw new ReturnError(404, "Return not found");
  const action = String(body.action ?? "");
  const note = cleanText(body.note, 500);
  const conflict = (m: string) => new ReturnError(409, m);
  const fresh = async () => (await SuitReturn.findById(id).lean<Doc>()) as Doc;
  // Re-read AFTER the transaction commits (reading inside it without the session would return the old state).
  const inTx = async (work: (ctx: AtomicCtx) => Promise<unknown>) => { await atomically(work); return fresh(); };

  switch (action) {
    case "decide": {
      const decision = body.decision;
      if (decision !== "approved" && decision !== "rejected") throw new ReturnError(400, "Decision must be approved or rejected.");
      if (decision === "rejected" && note.length < 3) throw new ReturnError(400, "Please give a reason for rejecting the return.");
      return inTx(async (ctx) => {
        const before = await SuitReturn.findOneAndUpdate(
          { _id: id, "decision.status": "pending" },
          { $set: { "decision.status": decision, "decision.byId": actor.id, "decision.byEmail": actor.email, "decision.at": new Date(), "decision.note": note, ...(decision === "rejected" ? { resolution: "rejected" } : {}) }, $push: { history: hist(`decision_${decision}`, actor, note) } },
          { session: ctx.session ?? undefined, returnDocument: "before" },
        ).lean<Doc>();
        if (!before) throw conflict("A decision has already been recorded for this return.");
        ctx.onUndo(async () => { await SuitReturn.updateOne({ _id: id }, { $set: { "decision.status": "pending", resolution: "none" }, $pop: { history: 1 } }); });
        if (decision === "rejected") await release(ctx, String(ret.orderRef), ret.items); // those units can be returned in a later request
      });
    }
    case "receive": {
      const r = await SuitReturn.findOneAndUpdate({ _id: id, "decision.status": "approved", "receipt.status": "not_received" }, { $set: { "receipt.status": "received", "receipt.byId": actor.id, "receipt.byEmail": actor.email, "receipt.at": new Date(), "receipt.note": note }, $push: { history: hist("received", actor, note) } }, { returnDocument: "after" }).lean<Doc>();
      if (!r) throw conflict("The return must be approved, and can only be marked received once.");
      return r;
    }
    case "inspect": {
      if (body.result !== "resellable" && body.result !== "not_resellable") throw new ReturnError(400, "Inspection result must be resellable or not_resellable.");
      const r = await SuitReturn.findOneAndUpdate({ _id: id, "receipt.status": "received", "inspection.result": "pending" }, { $set: { "inspection.result": body.result, "inspection.byId": actor.id, "inspection.byEmail": actor.email, "inspection.at": new Date(), "inspection.note": note }, $push: { history: hist(`inspected_${body.result}`, actor, note) } }, { returnDocument: "after" }).lean<Doc>();
      if (!r) throw conflict("Items must be received first, and the inspection can only be recorded once.");
      return r;
    }
    case "restock": {
      if (!actor.permissions.stock) throw new ReturnError(403, "Forbidden: restoring stock needs the stock permission.");
      return inTx(async (ctx) => {
        const session = ctx.session ?? undefined;
        const before = await SuitReturn.findOneAndUpdate(
          { _id: id, "decision.status": "approved", "receipt.status": "received", "inspection.result": "resellable", restocked: false },
          { $set: { restocked: true, restockedAt: new Date() }, $push: { history: hist("restocked", actor, note) } },
          { session, returnDocument: "before" },
        ).lean<Doc>();
        if (!before) throw conflict("Stock is restored only after approval, physical receipt and a resellable inspection, and only once.");
        ctx.onUndo(async () => { await SuitReturn.updateOne({ _id: id }, { $set: { restocked: false }, $unset: { restockedAt: 1 }, $pop: { history: 1 } }); });
        const rows: Record<string, unknown>[] = [];
        for (const it of before.items as Doc[]) {
          const suit = await UnstitchedSuit.findById(it.suitId).select("sku stock variants").session(ctx.session ?? null).lean<Doc>();
          if (!suit) throw new ReturnError(409, `Suit ${it.sku} no longer exists, so stock cannot be restored.`);
          const variantId = restoreTarget(suit, it.variantId); // the returned variant (see restoreTarget for changed variants)
          const op = stockIncOp(it.suitId, variantId, it.quantity);
          const after = await UnstitchedSuit.findOneAndUpdate(op.filter, op.update, { ...op.options, session, returnDocument: "after" }).lean<Doc>();
          if (!after) throw new ReturnError(409, `Stock for ${it.sku} changed meanwhile. Please try again.`);
          const undo = stockIncOp(it.suitId, variantId, -it.quantity);
          ctx.onUndo(async () => { await UnstitchedSuit.updateOne({ _id: it.suitId }, undo.update, undo.options); });
          const resultingQty = trackedQty(after, variantId);
          rows.push({ suitId: it.suitId, sku: trackedSku(after, variantId), ...(variantId ? { variantId } : {}), previousQty: resultingQty - it.quantity, change: it.quantity, resultingQty, reason: "return_restock", note: "", refType: "return", refId: before.returnId, actorId: actor.id, actorEmail: actor.email });
        }
        await StockMovement.insertMany(rows, { session });
        ctx.onUndo(async () => { await StockMovement.deleteMany({ refType: "return", refId: before.returnId, reason: "return_restock" }); });
      });
    }
    case "resolve": {
      const resolution = body.resolution;
      if (resolution !== "refund" && resolution !== "exchange" && resolution !== "closed") throw new ReturnError(400, "Resolution must be refund, exchange or closed.");
      if (ret.decision.status !== "approved") throw conflict("Approve the return before choosing a resolution.");
      if (ret.exchange?.fulfilled) throw conflict("The replacement has already been sent, so the resolution cannot change.");
      const $set: Record<string, unknown> = { resolution };
      if (resolution === "exchange") {
        const ex = (body.exchange ?? {}) as { replacementSuitId?: unknown; replacementVariantId?: unknown; quantity?: unknown };
        if (!isObjectId(ex.replacementSuitId)) throw new ReturnError(400, "Choose the replacement suit.");
        const qty = typeof ex.quantity === "number" && Number.isInteger(ex.quantity) && ex.quantity >= 1 && ex.quantity <= 999 ? ex.quantity : null;
        if (!qty) throw new ReturnError(400, "Replacement quantity must be a whole number.");
        const suit = await UnstitchedSuit.findById(ex.replacementSuitId).select("sku name stock variants").lean<Doc>();
        if (!suit) throw new ReturnError(400, "Replacement suit not found.");
        const variant = findVariant(suit, ex.replacementVariantId);
        if (hasVariants(suit) && !variant) throw new ReturnError(400, `Choose which variant of ${suit.sku} to send.`);
        Object.assign($set, { "exchange.replacementSuitId": suit._id, "exchange.replacementVariantId": variant ? variant._id : null, "exchange.sku": variant ? variant.code : suit.sku, "exchange.name": suit.name, "exchange.quantity": qty, "exchange.fulfilled": false });
      }
      const r = await SuitReturn.findOneAndUpdate({ _id: id, "decision.status": "approved", "exchange.fulfilled": { $ne: true } }, { $set, $push: { history: hist(`resolution_${resolution}`, actor, note) } }, { returnDocument: "after" }).lean<Doc>();
      if (!r) throw conflict("The resolution could not be changed.");
      return r;
    }
    case "fulfil-exchange": {
      if (!actor.permissions.stock) throw new ReturnError(403, "Forbidden: sending a replacement deducts stock and needs the stock permission.");
      return inTx(async (ctx) => {
        const session = ctx.session ?? undefined;
        const before = await SuitReturn.findOneAndUpdate(
          { _id: id, "decision.status": "approved", resolution: "exchange", "exchange.fulfilled": false, "exchange.replacementSuitId": { $exists: true } },
          { $set: { "exchange.fulfilled": true, "exchange.fulfilledAt": new Date() }, $push: { history: hist("exchange_fulfilled", actor, note) } },
          { session, returnDocument: "before" },
        ).lean<Doc>();
        if (!before) throw conflict("Choose the exchange resolution and a replacement first; the replacement can only be sent once.");
        ctx.onUndo(async () => { await SuitReturn.updateOne({ _id: id }, { $set: { "exchange.fulfilled": false }, $unset: { "exchange.fulfilledAt": 1 }, $pop: { history: 1 } }); });
        const ex = before.exchange as Doc;
        const vid = ex.replacementVariantId ?? null;
        const op = stockIncOp(ex.replacementSuitId, vid, -ex.quantity);
        const after = await UnstitchedSuit.findOneAndUpdate(op.filter, op.update, { ...op.options, session, returnDocument: "after" }).lean<Doc>();
        if (!after) throw conflict(`Not enough stock of ${ex.sku} for the replacement.`);
        const undo = stockIncOp(ex.replacementSuitId, vid, ex.quantity);
        ctx.onUndo(async () => { await UnstitchedSuit.updateOne({ _id: ex.replacementSuitId }, undo.update, undo.options); });
        const resultingQty = trackedQty(after, vid);
        await StockMovement.create([{ suitId: ex.replacementSuitId, sku: ex.sku, ...(vid ? { variantId: vid } : {}), previousQty: resultingQty + ex.quantity, change: -ex.quantity, resultingQty, reason: "exchange", note: "", refType: "return", refId: before.returnId, actorId: actor.id, actorEmail: actor.email }], { session });
        ctx.onUndo(async () => { await StockMovement.deleteMany({ refType: "return", refId: before.returnId, reason: "exchange" }); });
      });
    }
    case "shipping": {
      const c = parseCourier({ courierName: body.courier, trackingNumber: body.trackingNumber, trackingUrl: body.trackingUrl });
      if (!c.ok) throw new ReturnError(400, c.message);
      const $set: Record<string, unknown> = {};
      if (c.data.name !== undefined) $set["returnShipping.courier"] = c.data.name;
      if (c.data.trackingNumber !== undefined) $set["returnShipping.trackingNumber"] = c.data.trackingNumber;
      if (c.data.trackingUrl !== undefined) $set["returnShipping.trackingUrl"] = c.data.trackingUrl;
      if (!Object.keys($set).length) throw new ReturnError(400, "Nothing to update.");
      return SuitReturn.findByIdAndUpdate(id, { $set, $push: { history: hist("return_shipping_updated", actor) } }, { returnDocument: "after" }).lean<Doc>();
    }
    case "photos": {
      const p = parsePhotos(body.photos);
      if (!p.ok) throw new ReturnError(400, p.message);
      const merged = [...ret.photos.map((x: Doc) => ({ url: x.url, publicId: x.publicId })), ...p.data.filter((n) => !ret.photos.some((x: Doc) => x.url === n.url))];
      if (merged.length > 10) throw new ReturnError(400, "At most 10 photos per return.");
      return SuitReturn.findByIdAndUpdate(id, { $set: { photos: merged }, $push: { history: hist("evidence_added", actor, `${merged.length - ret.photos.length} photo(s)`) } }, { returnDocument: "after" }).lean<Doc>();
    }
    case "note": {
      if (note.length < 2) throw new ReturnError(400, "Enter a note.");
      return SuitReturn.findByIdAndUpdate(id, { $push: { history: hist("note", actor, note) } }, { returnDocument: "after" }).lean<Doc>();
    }
    default:
      throw new ReturnError(400, "Unknown action.");
  }
}

export function serializeReturn(r: Doc) {
  return {
    id: String(r._id), returnId: r.returnId, orderRef: String(r.orderRef), orderId: r.orderId, type: r.type,
    reasonType: r.reasonType, reasonNote: r.reasonNote, unusedUncutConfirmed: r.unusedUncutConfirmed,
    items: r.items.map((i: Doc) => ({ suitId: String(i.suitId), variantId: i.variantId ? String(i.variantId) : null, sku: i.sku, name: i.name, quantity: i.quantity, unitPricePaise: i.unitPricePaise })),
    photos: (r.photos ?? []).map((p: Doc) => p.url),
    requestedAt: r.requestedAt, deliveredAt: r.deliveredAtSnapshot, withinWindow: r.withinWindow, exceptionNote: r.exceptionNote,
    returnShipping: r.returnShipping, decision: r.decision, receipt: r.receipt, inspection: r.inspection, resolution: r.resolution,
    exchange: r.exchange?.replacementSuitId ? { replacementSuitId: String(r.exchange.replacementSuitId), replacementVariantId: r.exchange.replacementVariantId ? String(r.exchange.replacementVariantId) : null, sku: r.exchange.sku, name: r.exchange.name, quantity: r.exchange.quantity, fulfilled: Boolean(r.exchange.fulfilled), fulfilledAt: r.exchange.fulfilledAt } : null,
    restocked: r.restocked, restockedAt: r.restockedAt, history: r.history, createdByEmail: r.createdByEmail, createdAt: r.createdAt,
  };
}
