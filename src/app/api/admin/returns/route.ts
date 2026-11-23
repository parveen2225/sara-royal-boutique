import type { NextRequest } from "next/server";
import SuitReturn from "@/models/SuitReturn";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requirePermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { BadRequestError, cleanText, isObjectId, readJsonBody } from "@/lib/validation";
import { parseReturnInput } from "@/lib/returnInput";
import { createReturn, ReturnError, serializeReturn } from "@/lib/returnService";
import { escapeRegex } from "@/lib/suitInput";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "returns");
  if (!auth.ok) return auth.response;
  const p = req.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};
  const status = p.get("status");
  if (status) {
    if (!["pending", "approved", "rejected"].includes(status)) return jsonError("Invalid status filter", 400);
    filter["decision.status"] = status;
  }
  const order = p.get("orderRef");
  if (order) { if (!isObjectId(order)) return jsonError("Invalid order filter", 400); filter.orderRef = order; }
  const q = cleanText(p.get("q"), 80);
  if (q) { const rx = new RegExp(escapeRegex(q), "i"); filter.$or = [{ returnId: rx }, { orderId: rx }, { "items.sku": rx }]; }
  const limit = Number(p.get("limit") ?? 20);
  if (![10, 20, 50].includes(limit)) return jsonError("Page size must be 10, 20 or 50", 400);
  const page = Math.max(1, Math.floor(Number(p.get("page") ?? 1)) || 1);
  const [total, docs] = await Promise.all([SuitReturn.countDocuments(filter), SuitReturn.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean()]);
  return jsonOk({ items: docs.map((d) => serializeReturn(d)), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "returns");
  if (!auth.ok) return auth.response;
  try {
    const parsed = parseReturnInput(await readJsonBody(req));
    if (!parsed.ok) return jsonError(parsed.message, 400);
    const created = await createReturn(parsed.data, auth.user);
    await logAudit(auth.user, "return.created", { type: "return", id: String(created._id) }, `${created.returnId} for ${created.orderId}`, { withinWindow: created.withinWindow });
    return jsonOk(serializeReturn(created), { status: 201 });
  } catch (error) {
    if (error instanceof BadRequestError) return jsonError(error.message, 400);
    if (error instanceof ReturnError) return jsonError(error.message, error.status);
    console.error("[API /admin/returns POST]", error instanceof Error ? error.message : error);
    return jsonError("Could not record the return", 500);
  }
}
