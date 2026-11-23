import type { NextRequest } from "next/server";
import SuitRefund from "@/models/SuitRefund";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requirePermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { BadRequestError, cleanText, isObjectId, readJsonBody } from "@/lib/validation";
import { recommendRefund, RefundError, serializeRefund } from "@/lib/refundService";
import { escapeRegex } from "@/lib/suitInput";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "returns");
  if (!auth.ok) return auth.response;
  const p = req.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};
  const status = p.get("status");
  if (status) { if (!["pending", "processing", "completed", "failed"].includes(status)) return jsonError("Invalid status filter", 400); filter.status = status; }
  const approval = p.get("approval");
  if (approval) { if (!["recommended", "approved", "rejected"].includes(approval)) return jsonError("Invalid approval filter", 400); filter["approval.status"] = approval; }
  const order = p.get("orderRef");
  if (order) { if (!isObjectId(order)) return jsonError("Invalid order filter", 400); filter.orderRef = order; }
  const q = cleanText(p.get("q"), 80);
  if (q) { const rx = new RegExp(escapeRegex(q), "i"); filter.$or = [{ refundId: rx }, { orderId: rx }, { returnId: rx }, { utr: rx }]; }
  const limit = Number(p.get("limit") ?? 20);
  if (![10, 20, 50].includes(limit)) return jsonError("Page size must be 10, 20 or 50", 400);
  const page = Math.max(1, Math.floor(Number(p.get("page") ?? 1)) || 1);
  const [total, docs] = await Promise.all([SuitRefund.countDocuments(filter), SuitRefund.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean()]);
  return jsonOk({ items: docs.map((d) => serializeRefund(d)), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
}

// Recommend a refund (Staff or Owner). Approval and payment completion are separate Owner-only actions.
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "returns");
  if (!auth.ok) return auth.response;
  try {
    const refund = await recommendRefund(await readJsonBody(req), auth.user);
    await logAudit(auth.user, "refund.recommended", { type: "refund", id: String(refund._id) }, `${refund.refundId} ${refund.orderId} ${refund.amountPaise}`);
    return jsonOk(serializeRefund(refund), { status: 201 });
  } catch (error) {
    if (error instanceof BadRequestError) return jsonError(error.message, 400);
    if (error instanceof RefundError) return jsonError(error.message, error.status);
    console.error("[API /admin/refunds POST]", error instanceof Error ? error.message : error);
    return jsonError("Could not record the refund", 500);
  }
}
