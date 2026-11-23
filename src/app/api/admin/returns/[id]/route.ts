import type { NextRequest } from "next/server";
import SuitReturn from "@/models/SuitReturn";
import StockMovement from "@/models/StockMovement";
import SuitRefund from "@/models/SuitRefund";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requirePermission } from "@/lib/auth/permissions";
import { isObjectId } from "@/lib/validation";
import { serializeReturn } from "@/lib/returnService";
import { serializeRefund } from "@/lib/refundService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "returns");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Return not found", 404);
  const r = await SuitReturn.findById(id).lean();
  if (!r) return jsonError("Return not found", 404);
  const [moves, refunds] = await Promise.all([
    StockMovement.find({ refType: "return", refId: r.returnId }).sort({ createdAt: 1 }).lean(),
    SuitRefund.find({ returnRef: r._id }).sort({ createdAt: 1 }).lean(),
  ]);
  return jsonOk({ ...serializeReturn(r), stockMovements: moves.map((m) => ({ sku: m.sku, change: m.change, resultingQty: m.resultingQty, reason: m.reason, at: m.createdAt })), refunds: refunds.map((x) => serializeRefund(x)) });
}
