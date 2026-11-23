import type { NextRequest } from "next/server";
import SuitRefund from "@/models/SuitRefund";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requirePermission } from "@/lib/auth/permissions";
import { isObjectId } from "@/lib/validation";
import { serializeRefund } from "@/lib/refundService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "returns");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Refund not found", 404);
  const r = await SuitRefund.findById(id).lean();
  return r ? jsonOk(serializeRefund(r)) : jsonError("Refund not found", 404);
}
