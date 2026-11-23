import type { NextRequest } from "next/server";
import SuitOrder from "@/models/SuitOrder";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requirePermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { BadRequestError, readJsonBody } from "@/lib/validation";
import { parseOrderInput } from "@/lib/orderInput";
import { createOrder, OrderError, serializeOrder } from "@/lib/orderService";
import { buildOrderFilter } from "@/lib/orderFilter";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
const SORTS: Record<string, Record<string, 1 | -1>> = { newest: { createdAt: -1, _id: -1 }, oldest: { createdAt: 1, _id: 1 }, total_desc: { totalPaise: -1, _id: -1 }, total_asc: { totalPaise: 1, _id: 1 } };

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "orders");
  if (!auth.ok) return auth.response;
  const p = req.nextUrl.searchParams;
  const built = buildOrderFilter(p);
  if ("error" in built) return jsonError(built.error, 400);
  const sortKey = p.get("sort") ?? "newest";
  if (!SORTS[sortKey]) return jsonError("Invalid sort", 400);
  const limit = Number(p.get("limit") ?? 20);
  if (![10, 20, 50].includes(limit)) return jsonError("Page size must be 10, 20 or 50", 400);
  const page = Math.max(1, Math.floor(Number(p.get("page") ?? 1)) || 1);
  const [total, docs] = await Promise.all([
    SuitOrder.countDocuments(built.filter),
    SuitOrder.find(built.filter).sort(SORTS[sortKey]).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  return jsonOk({ items: docs.map((d) => serializeOrder(d as never)), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
}

// Create a CONFIRMED order (after the customer confirmed on WhatsApp). Deducts stock atomically.
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "orders");
  if (!auth.ok) return auth.response;
  if (!rateLimit(`order-create:${auth.user.id}`, 60, 60_000).allowed) return jsonError("Too many requests", 429);
  try {
    const parsed = parseOrderInput(await readJsonBody(req));
    if (!parsed.ok) return jsonError(parsed.message, 400);
    const { order, duplicate } = await createOrder(parsed.data, auth.user);
    if (!duplicate) await logAudit(auth.user, "order.created", { type: "order", id: String(order._id) }, `${order.orderId} total ${order.totalPaise}`, { items: order.items.length });
    return jsonOk({ ...serializeOrder(order as never), duplicate }, { status: duplicate ? 200 : 201 });
  } catch (error) {
    if (error instanceof BadRequestError) return jsonError(error.message, 400);
    if (error instanceof OrderError) return jsonError(error.message, error.status);
    console.error("[API /admin/orders POST]", error instanceof Error ? error.message : error);
    return jsonError("Could not create the order", 500);
  }
}
