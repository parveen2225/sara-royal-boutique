import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requirePermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { BadRequestError, isObjectId, readJsonBody } from "@/lib/validation";
import { OrderError, serializeOrder, setPayment } from "@/lib/orderService";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "orders");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Order not found", 404);
  try {
    const order = await setPayment(id, await readJsonBody(req), auth.user);
    await logAudit(auth.user, "order.payment_changed", { type: "order", id }, `${order.orderId}: ${order.paymentStatus}`);
    return jsonOk(serializeOrder(order as never));
  } catch (error) {
    if (error instanceof BadRequestError) return jsonError(error.message, 400);
    if (error instanceof OrderError) return jsonError(error.message, error.status);
    console.error("[API /admin/orders/:id/payment]", error instanceof Error ? error.message : error);
    return jsonError("Could not update payment", 500);
  }
}
