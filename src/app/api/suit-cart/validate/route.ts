import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import UnstitchedSuit from "@/models/UnstitchedSuit";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { BadRequestError, isObjectId, readJsonBody } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { MAX_CART_LINES, MAX_LINE_QTY } from "@/lib/cartCore";

// Re-checks a cart against the database right before checkout: current price, stock and published status.
// Read-only: it never reserves stock or creates anything.
export async function POST(req: NextRequest) {
  if (!rateLimit(`cartval:${clientIp(req.headers)}`, 60, 60_000).allowed) return jsonError("Too many requests", 429);
  try {
    const body = await readJsonBody(req, 32 * 1024);
    const raw = body.items;
    if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_CART_LINES) return jsonError("Cart must contain 1 to 50 items.", 400);
    const wanted: { id: string; quantity: number }[] = [];
    const seen = new Set<string>();
    for (const r of raw) {
      const row = r as { id?: unknown; quantity?: unknown };
      if (!isObjectId(row?.id) || seen.has(row.id)) return jsonError("Cart contains an invalid or duplicate item.", 400);
      if (typeof row.quantity !== "number" || !Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > MAX_LINE_QTY) return jsonError("Cart contains an invalid quantity.", 400);
      seen.add(row.id);
      wanted.push({ id: row.id, quantity: row.quantity });
    }
    if (!isMongoConfigured()) return jsonError("Service unavailable", 503);
    await connectMongo();
    const docs = await UnstitchedSuit.find({ _id: { $in: wanted.map((w) => w.id) } }).lean();
    const byId = new Map(docs.map((d) => [String(d._id), d]));

    let subtotalPaise = 0;
    let canCheckout = true;
    const items = wanted.map(({ id, quantity }) => {
      const d = byId.get(id);
      if (!d) { canCheckout = false; return { id, ok: false, issue: "not_found", quantity }; }
      if (d.status !== "published") { canCheckout = false; return { id, ok: false, issue: "unavailable", quantity }; }
      const base = { id, name: d.name, sku: d.sku, image: d.fabricImages?.[0]?.url ?? "", unitPricePaise: d.salePricePaise, maxQuantity: d.stock, quantity };
      if (d.stock <= 0) { canCheckout = false; return { ...base, ok: false, issue: "out_of_stock" }; }
      if (quantity > d.stock) { canCheckout = false; return { ...base, ok: false, issue: "insufficient_stock" }; }
      subtotalPaise += d.salePricePaise * quantity;
      return { ...base, ok: true, lineTotalPaise: d.salePricePaise * quantity };
    });
    return jsonOk({ items, subtotalPaise, canCheckout });
  } catch (error) {
    if (error instanceof BadRequestError) return jsonError(error.message, 400);
    console.error("[API /suit-cart/validate]", error instanceof Error ? error.message : error);
    return jsonError("Could not validate cart", 500);
  }
}
