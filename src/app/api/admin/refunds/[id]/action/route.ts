import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requireOwner } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { BadRequestError, isObjectId, readJsonBody } from "@/lib/validation";
import { refundOwnerAction, RefundError, serializeRefund } from "@/lib/refundService";

// OWNER ONLY: approve / reject / process / complete / fail. Staff (even with every permission) get 403.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Refund not found", 404);
  try {
    const body = await readJsonBody(req);
    const refund = await refundOwnerAction(id, body, auth.user);
    await logAudit(auth.user, `refund.${String(body.action)}`, { type: "refund", id }, `${refund.refundId} ${refund.status}`, { amountPaise: refund.amountPaise });
    return jsonOk(serializeRefund(refund));
  } catch (error) {
    if (error instanceof BadRequestError) return jsonError(error.message, 400);
    if (error instanceof RefundError) return jsonError(error.message, error.status);
    console.error("[API /admin/refunds/:id/action]", error instanceof Error ? error.message : error);
    return jsonError("Could not update the refund", 500);
  }
}
