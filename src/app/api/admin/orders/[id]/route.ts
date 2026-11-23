import type { NextRequest } from "next/server";
import SuitOrder from "@/models/SuitOrder";
import StockMovement from "@/models/StockMovement";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requirePermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { BadRequestError, cleanText, isObjectId, isPincode, normalizeCustomerPhone, readJsonBody } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";
import { parseCourier } from "@/lib/orderInput";
import { serializeOrder } from "@/lib/orderService";

type Ctx = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: Ctx) {
  const auth = await requirePermission(req, "orders");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Order not found", 404);
  const order = await SuitOrder.findById(id).lean();
  if (!order) return jsonError("Order not found", 404);
  const movements = await StockMovement.find({ refType: "order", refId: order.orderId }).sort({ createdAt: 1 }).lean();
  return jsonOk({
    ...serializeOrder(order as never),
    stockMovements: movements.map((m) => ({ sku: m.sku, previousQty: m.previousQty, change: m.change, resultingQty: m.resultingQty, reason: m.reason, at: m.createdAt })),
  });
}

// Edit customer details, notes, delivery charge and courier fields. Items cannot be edited (cancel and re-create instead)
// because stock was deducted for exactly those quantities.
export async function PUT(req: NextRequest, { params }: Ctx) {
  const auth = await requirePermission(req, "orders");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Order not found", 404);
  try {
    const body = await readJsonBody(req);
    const order = await SuitOrder.findById(id).lean();
    if (!order) return jsonError("Order not found", 404);
    const $set: Record<string, unknown> = {};
    const moneyLocked = Boolean(order.invoiceId) || order.status === "cancelled" || order.status === "delivered";

    if ("items" in body || "status" in body || "paymentStatus" in body) return jsonError("Items and status cannot be edited here. Use the order actions.", 400);
    if ("customer" in body) {
      if (order.status === "cancelled") return jsonError("A cancelled order cannot be edited.", 409);
      const c = (body.customer ?? {}) as Record<string, unknown>;
      if ("name" in c) { const n = cleanText(c.name, 120); if (n.length < 2) return jsonError("Customer name is required.", 400); $set["customer.name"] = n; }
      if ("phone" in c) { const ph = normalizeCustomerPhone(c.phone); if (!ph) return jsonError("Enter a valid customer phone number.", 400); $set["customer.phone"] = ph; }
      if ("address" in c) { const a = cleanText(c.address, 500); if (a.length < 5) return jsonError("Full delivery address is required.", 400); $set["customer.address"] = a; }
      if ("pincode" in c) { if (!isPincode(c.pincode)) return jsonError("Enter a valid 6-digit PIN code.", 400); $set["customer.pincode"] = c.pincode; }
    }
    if ("notes" in body) $set.notes = cleanText(body.notes, 1000);
    if ("deliveryCharge" in body) {
      if (moneyLocked) return jsonError("The amount can no longer be changed (order is invoiced, delivered or cancelled).", 409);
      const d = rupeesToPaise(body.deliveryCharge);
      if (d === null) return jsonError("Delivery charge must be a valid amount.", 400);
      $set.deliveryChargePaise = d;
      $set.totalPaise = order.subtotalPaise + d;
    }
    if ("paymentMethod" in body) {
      if (body.paymentMethod !== "cod" && body.paymentMethod !== "upi") return jsonError("Payment method must be COD or UPI.", 400);
      if (order.invoiceId) return jsonError("The payment method can no longer be changed (invoice issued).", 409);
      $set.paymentMethod = body.paymentMethod;
    }
    const courier = parseCourier(body);
    if (!courier.ok) return jsonError(courier.message, 400);
    if (order.status !== "cancelled") {
      if (courier.data.name !== undefined) $set["courier.name"] = courier.data.name;
      if (courier.data.trackingNumber !== undefined) $set["courier.trackingNumber"] = courier.data.trackingNumber;
      if (courier.data.trackingUrl !== undefined) $set["courier.trackingUrl"] = courier.data.trackingUrl;
    }
    if (!Object.keys($set).length) return jsonError("Nothing to update.", 400);
    const updated = await SuitOrder.findByIdAndUpdate(id, { $set }, { returnDocument: "after" }).lean();
    await logAudit(auth.user, "order.updated", { type: "order", id }, order.orderId, { fields: Object.keys($set) });
    return jsonOk(serializeOrder(updated as never));
  } catch (error) {
    if (error instanceof BadRequestError) return jsonError(error.message, 400);
    console.error("[API /admin/orders/:id PUT]", error instanceof Error ? error.message : error);
    return jsonError("Could not update the order", 500);
  }
}
