import type { NextRequest } from "next/server";
import AuditLog from "@/models/AuditLog";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requireOwner } from "@/lib/auth/permissions";
import { istRangeFromDates } from "@/lib/dates";
import { cleanText } from "@/lib/validation";
import { escapeRegex } from "@/lib/suitInput";

export const dynamic = "force-dynamic";

// Owner-only review of the audit trail (who did what, when). Read-only.
export async function GET(req: NextRequest) {
  const auth = await requireOwner(req);
  if (!auth.ok) return auth.response;
  const p = req.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};
  const action = cleanText(p.get("action"), 60);
  if (action) filter.action = new RegExp(`^${escapeRegex(action)}`, "i");
  const actor = cleanText(p.get("actor"), 80);
  if (actor) filter.actorEmail = new RegExp(escapeRegex(actor), "i");
  const entity = cleanText(p.get("entityType"), 40);
  if (entity) filter.entityType = entity;
  if (p.get("from") || p.get("to")) {
    const range = istRangeFromDates(p.get("from"), p.get("to") ?? p.get("from"));
    if (!range) return jsonError("Invalid date range.", 400);
    filter.createdAt = { $gte: range.from, $lt: range.to };
  }
  const limit = Number(p.get("limit") ?? 50);
  if (![20, 50, 100].includes(limit)) return jsonError("Page size must be 20, 50 or 100", 400);
  const page = Math.max(1, Math.floor(Number(p.get("page") ?? 1)) || 1);
  const [total, docs] = await Promise.all([AuditLog.countDocuments(filter), AuditLog.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean()]);
  return jsonOk({
    items: docs.map((d) => ({ id: String(d._id), at: d.createdAt, actorEmail: d.actorEmail, actorRole: d.actorRole, action: d.action, entityType: d.entityType, entityId: d.entityId, summary: d.summary, meta: d.meta })),
    total, page, limit, pages: Math.max(1, Math.ceil(total / limit)),
  });
}
