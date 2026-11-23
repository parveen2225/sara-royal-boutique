import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requirePermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { BadRequestError, cleanText, isObjectId, readJsonBody } from "@/lib/validation";
import { cancelOrder, OrderError, serializeOrder } from "@/lib/orderService";

// Cancels the order and restores its stock exactly once.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "orders");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Order not found", 404);
  try {
    const body = await readJsonBody(req);
    const reason = cleanText(body.reason, 500);
    if (reason.length < 3) return jsonError("Please enter a reason for the cancellation.", 400);
    const order = await cancelOrder(id, reason, auth.user);
    await logAudit(auth.user, "order.cancelled", { type: "order", id }, `${order.orderId}: ${reason}`);
    return jsonOk(serializeOrder(order as never));
  } catch (error) {
    if (error instanceof BadRequestError) return jsonError(error.message, 400);
    if (error instanceof OrderError) return jsonError(error.message, error.status);
    console.error("[API /admin/orders/:id/cancel]", error instanceof Error ? error.message : error);
    return jsonError("Could not cancel the order", 500);
  }
}
