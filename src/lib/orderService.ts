import UnstitchedSuit from "@/models/UnstitchedSuit";
import SuitOrder from "@/models/SuitOrder";
import StockMovement from "@/models/StockMovement";
import { atomically, type AtomicCtx } from "@/lib/atomic";
import { nextSequence } from "@/lib/counters";
import { istYear } from "@/lib/dates";
import { cleanText } from "@/lib/validation";
import { isAllowedTransition, parseCourier, parseEventDate, type ParsedOrder } from "@/lib/orderInput";
import type { AuthUser } from "@/lib/auth/permissions";
import { findVariant, hasVariants, restoreTarget, stockIncOp, trackedQty, trackedSku } from "@/lib/variantStock";

export class OrderError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Actor = Pick<AuthUser, "id" | "email">;
type Line = { returnedQuantity?: number; suitId: unknown; variantId?: unknown; sku: string; name: string; unitPricePaise: number; quantity: number; lineTotalPaise: number };
type OrderDoc = {
  _id: unknown; orderId: string; items: Line[]; status: string; stockDeducted: boolean; paymentStatus: string;
  subtotalPaise: number; deliveryChargePaise: number; totalPaise: number; refundCommittedPaise?: number;
  customer: { name: string; phone: string; address: string; pincode: string };
  courier?: { name?: string; trackingNumber?: string; trackingUrl?: string; shippedAt?: Date };
  [k: string]: unknown;
};

export const formatOrderId = (year: number, seq: number) => `SRO-${year}-${String(seq).padStart(4, "0")}`;
const historyEntry = (status: string, actor: Actor, note = "") => ({ status, at: new Date(), byId: actor.id, byEmail: actor.email, note });

async function movementsFor(ctx: AtomicCtx, lines: { suitId: unknown; variantId?: unknown; sku: string; quantity: number }[], dir: 1 | -1, reason: "order_confirmed" | "order_cancelled", orderId: string, actor: Actor) {
  const rows: Record<string, unknown>[] = [];
  for (const l of lines) {
    // Deductions use exactly the ordered variant. Restorations go back to it, or (if the suit's variants changed since
    // the order) to restoreTarget(), so cancelling always works and the suit's total stays the sum of its variants.
    let variantId: unknown = l.variantId ?? null;
    if (dir === 1) {
      const suit = await UnstitchedSuit.findById(l.suitId).select("sku stock variants").session(ctx.session ?? null).lean();
      if (!suit) throw new OrderError(409, `Suit ${l.sku} no longer exists.`);
      variantId = restoreTarget(suit, variantId);
    }
    const op = stockIncOp(l.suitId, variantId, dir * l.quantity);
    const after = await UnstitchedSuit.findOneAndUpdate(op.filter, op.update, { ...op.options, session: ctx.session ?? undefined, returnDocument: "after" }).lean();
    if (!after) {
      const current = await UnstitchedSuit.findById(l.suitId).select("stock sku variants").session(ctx.session ?? null).lean();
      if (current && hasVariants(current) && !findVariant(current, variantId)) throw new OrderError(409, `Choose which variant of ${current.sku} was ordered.`);
      throw new OrderError(409, current ? `Not enough stock for ${l.sku}: ${trackedQty(current, variantId)} available, ${l.quantity} requested.` : `Suit ${l.sku} no longer exists.`);
    }
    const undo = stockIncOp(l.suitId, variantId, -dir * l.quantity);
    ctx.onUndo(async () => { await UnstitchedSuit.updateOne({ _id: l.suitId }, undo.update, undo.options); });
    const resultingQty = trackedQty(after, variantId);
    rows.push({ suitId: l.suitId, sku: trackedSku(after, variantId), ...(variantId ? { variantId } : {}), previousQty: resultingQty - dir * l.quantity, change: dir * l.quantity, resultingQty, reason, note: "", refType: "order", refId: orderId, actorId: actor.id, actorEmail: actor.email });
  }
  await StockMovement.insertMany(rows, { session: ctx.session ?? undefined });
  ctx.onUndo(async () => { await StockMovement.deleteMany({ refType: "order", refId: orderId, reason }); });
}

/**
 * Create a confirmed order and deduct stock, as one atomic unit.
 *  - Every line uses a conditional update (stock >= qty): stock can never go negative, even with concurrent orders.
 *  - Prices are frozen from the suits' current sale price.
 *  - An optional idempotencyKey makes a repeated/double-clicked submit return the first order instead of deducting again.
 */
export async function createOrder(input: ParsedOrder, actor: Actor): Promise<{ order: OrderDoc; duplicate: boolean }> {
  if (input.idempotencyKey) {
    const existing = await SuitOrder.findOne({ idempotencyKey: input.idempotencyKey }).lean();
    if (existing) return { order: existing as unknown as OrderDoc, duplicate: true };
  }
  const year = istYear();
  const orderId = formatOrderId(year, await nextSequence(`suit-order-${year}`)); // numbers are never reused

  try {
    const order = await atomically(async (ctx) => {
      const session = ctx.session ?? undefined;
      const suits = await UnstitchedSuit.find({ _id: { $in: input.items.map((i) => i.suitId) } }).session(ctx.session ?? null).lean();
      const byId = new Map(suits.map((s) => [String(s._id), s]));
      const lines: Line[] = input.items.map((i) => {
        const s = byId.get(i.suitId);
        if (!s) throw new OrderError(400, "One of the suits in this order no longer exists.");
        // A suit with image variants is ordered per variant (each has its own stock); the price is the suit's.
        const v = findVariant(s, i.variantId);
        if (hasVariants(s) && !v) throw new OrderError(400, i.variantId ? `The chosen variant of ${s.sku} no longer exists.` : `Choose which variant of ${s.sku} (${s.name}) was ordered.`);
        if (!hasVariants(s) && i.variantId) throw new OrderError(400, `${s.sku} has no variants.`);
        return { suitId: s._id, ...(v ? { variantId: v._id } : {}), sku: v ? v.code : s.sku, name: s.name, unitPricePaise: s.salePricePaise, quantity: i.quantity, lineTotalPaise: s.salePricePaise * i.quantity };
      });
      const subtotalPaise = lines.reduce((sum, l) => sum + l.lineTotalPaise, 0);
      await movementsFor(ctx, lines, -1, "order_confirmed", orderId, actor);
      const [created] = await SuitOrder.create([{
        orderId, idempotencyKey: input.idempotencyKey, customer: input.customer, items: lines, subtotalPaise,
        deliveryChargePaise: input.deliveryChargePaise, totalPaise: subtotalPaise + input.deliveryChargePaise,
        paymentMethod: input.paymentMethod, paymentStatus: input.paymentStatus, paidAt: input.paymentStatus === "paid" ? new Date() : undefined,
        status: "confirmed", stockDeducted: true, notes: input.notes, statusHistory: [historyEntry("confirmed", actor, "Order confirmed")],
        createdById: actor.id, createdByEmail: actor.email,
      }], { session });
      return created.toObject() as unknown as OrderDoc;
    });
    return { order, duplicate: false };
  } catch (error) {
    // Lost a race with an identical submit: its stock deduction stands, ours was rolled back.
    if ((error as { code?: number })?.code === 11000 && input.idempotencyKey) {
      const existing = await SuitOrder.findOne({ idempotencyKey: input.idempotencyKey }).lean();
      if (existing) return { order: existing as unknown as OrderDoc, duplicate: true };
    }
    throw error;
  }
}

/**
 * Cancel an order and give the stock back exactly once. The first step is a conditional update that only succeeds
 * while stockDeducted is true; a repeated or concurrent cancel matches nothing and restores nothing.
 */
export async function cancelOrder(id: string, reason: string, actor: Actor): Promise<OrderDoc> {
  return atomically(async (ctx) => {
    const session = ctx.session ?? undefined;
    const before = await SuitOrder.findOneAndUpdate(
      { _id: id, status: { $in: ["confirmed", "packed", "shipped"] }, stockDeducted: true },
      { $set: { status: "cancelled", stockDeducted: false, cancelledAt: new Date(), cancelReason: cleanText(reason, 500) }, $push: { statusHistory: historyEntry("cancelled", actor, cleanText(reason, 500)) } },
      { session, returnDocument: "before" },
    ).lean();
    if (!before) {
      const o = await SuitOrder.findById(id).select("status").session(ctx.session ?? null).lean();
      if (!o) throw new OrderError(404, "Order not found");
      throw new OrderError(409, o.status === "cancelled" ? "Order is already cancelled." : "A delivered order cannot be cancelled. Use a return instead.");
    }
    ctx.onUndo(async () => { await SuitOrder.updateOne({ _id: id }, { $set: { status: before.status, stockDeducted: true }, $unset: { cancelledAt: 1 }, $pop: { statusHistory: 1 } }); });
    await movementsFor(ctx, (before as unknown as OrderDoc).items, 1, "order_cancelled", (before as unknown as OrderDoc).orderId, actor);
    return (await SuitOrder.findById(id).session(ctx.session ?? null).lean()) as unknown as OrderDoc;
  });
}

export type StatusInput = { status: string; body: Record<string, unknown> };

/** Forward-only status changes with courier details; shipping needs a courier name. */
export async function advanceOrderStatus(id: string, input: StatusInput, actor: Actor): Promise<OrderDoc> {
  const order = await SuitOrder.findById(id).lean();
  if (!order) throw new OrderError(404, "Order not found");
  const next = input.status;
  if (!["packed", "shipped", "delivered"].includes(next)) throw new OrderError(400, "Status must be packed, shipped or delivered. Use the cancel action to cancel.");
  if (!isAllowedTransition(order.status, next)) throw new OrderError(409, order.status === next ? `Order is already ${next}.` : `Cannot change a ${order.status} order to ${next}.`);

  const courier = parseCourier(input.body);
  if (!courier.ok) throw new OrderError(400, courier.message);
  const set: Record<string, unknown> = { status: next };
  const merged = { name: courier.data.name ?? order.courier?.name ?? "", trackingNumber: courier.data.trackingNumber ?? order.courier?.trackingNumber ?? "", trackingUrl: courier.data.trackingUrl ?? order.courier?.trackingUrl ?? "" };
  if (courier.data.name !== undefined) set["courier.name"] = merged.name;
  if (courier.data.trackingNumber !== undefined) set["courier.trackingNumber"] = merged.trackingNumber;
  if (courier.data.trackingUrl !== undefined) set["courier.trackingUrl"] = merged.trackingUrl;

  if (next === "shipped") {
    if (!merged.name.trim()) throw new OrderError(400, "Enter the courier name before marking the order as shipped.");
    const shippedAt = parseEventDate(input.body.shippedAt);
    if (shippedAt === null) throw new OrderError(400, "Shipping date is not valid.");
    set["courier.shippedAt"] = shippedAt ?? new Date();
  }
  if (next === "delivered") {
    const deliveredAt = parseEventDate(input.body.deliveredAt);
    if (deliveredAt === null) throw new OrderError(400, "Delivery date is not valid.");
    set.deliveredAt = deliveredAt ?? new Date();
  }
  const updated = await SuitOrder.findOneAndUpdate(
    { _id: id, status: order.status },
    { $set: set, $push: { statusHistory: historyEntry(next, actor, cleanText(input.body.note, 500)) } },
    { returnDocument: "after" },
  ).lean();
  if (!updated) throw new OrderError(409, "The order was changed by someone else. Reload and try again.");
  return updated as unknown as OrderDoc;
}

export async function setPayment(id: string, body: Record<string, unknown>, actor: Actor): Promise<OrderDoc> {
  const order = await SuitOrder.findById(id).lean();
  if (!order) throw new OrderError(404, "Order not found");
  if (order.status === "cancelled") throw new OrderError(409, "A cancelled order cannot be marked paid.");
  if (body.paymentStatus !== "paid" && body.paymentStatus !== "pending") throw new OrderError(400, "Payment status must be pending or paid.");
  if (order.paymentStatus === body.paymentStatus) throw new OrderError(409, `Payment is already ${body.paymentStatus}.`);
  if (body.paymentStatus === "pending" && (order.refundCommittedPaise ?? 0) > 0) throw new OrderError(409, "Payment cannot be reverted because a refund exists for this order.");
  const set: Record<string, unknown> = { paymentStatus: body.paymentStatus };
  if (body.paymentStatus === "paid") set.paidAt = new Date();
  const updated = await SuitOrder.findOneAndUpdate({ _id: id, paymentStatus: order.paymentStatus }, { $set: set, ...(body.paymentStatus === "pending" ? { $unset: { paidAt: 1 } } : {}), $push: { statusHistory: historyEntry(order.status, actor, `Payment marked ${body.paymentStatus}`) } }, { returnDocument: "after" }).lean();
  if (!updated) throw new OrderError(409, "The order was changed by someone else. Reload and try again.");
  return updated as unknown as OrderDoc;
}

export function serializeOrder(o: OrderDoc & Record<string, unknown>) {
  const o2 = o as Record<string, unknown>;
  return {
    id: String(o._id),
    orderId: o.orderId,
    customer: o.customer,
    items: o.items.map((i) => ({ suitId: String(i.suitId), variantId: i.variantId ? String(i.variantId) : null, sku: i.sku, name: i.name, unitPricePaise: i.unitPricePaise, quantity: i.quantity, lineTotalPaise: i.lineTotalPaise, returnedQuantity: (i as unknown as { returnedQuantity?: number }).returnedQuantity ?? 0 })),
    subtotalPaise: o.subtotalPaise,
    deliveryChargePaise: o.deliveryChargePaise,
    totalPaise: o.totalPaise,
    paymentMethod: o2.paymentMethod,
    paymentStatus: o.paymentStatus,
    paidAt: o2.paidAt,
    status: o.status,
    courier: o.courier ?? {},
    deliveredAt: o2.deliveredAt,
    cancelledAt: o2.cancelledAt,
    cancelReason: o2.cancelReason ?? "",
    notes: o2.notes ?? "",
    stockDeducted: o.stockDeducted,
    refundCommittedPaise: o.refundCommittedPaise ?? 0,
    invoiceId: o2.invoiceId ?? "",
    statusHistory: o2.statusHistory ?? [],
    createdByEmail: o2.createdByEmail ?? "",
    createdAt: o2.createdAt,
    updatedAt: o2.updatedAt,
  };
}

export type SerializedOrder = ReturnType<typeof serializeOrder>;
