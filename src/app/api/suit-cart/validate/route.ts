import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import UnstitchedSuit from "@/models/UnstitchedSuit";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { BadRequestError, isObjectId, readJsonBody } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { MAX_CART_LINES, MAX_LINE_QTY, lineKey } from "@/lib/cartCore";
import { findVariant, hasVariants } from "@/lib/variantStock";

// Re-checks a cart against the database right before checkout: current price, stock and published status.
// Read-only: it never reserves stock or creates anything.
export async function POST(req: NextRequest) {
  if (!rateLimit(`cartval:${clientIp(req.headers)}`, 60, 60_000).allowed) return jsonError("Too many requests", 429);
  try {
    const body = await readJsonBody(req, 32 * 1024);
    const raw = body.items;
    if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_CART_LINES) return jsonError("Cart must contain 1 to 50 items.", 400);
    // A line is a suit, or one image variant of a suit (`variantId`): two variants of one suit are separate lines.
    const wanted: { id: string; variantId?: string; quantity: number }[] = [];
    const seen = new Set<string>();
    for (const r of raw) {
      const row = r as { id?: unknown; variantId?: unknown; quantity?: unknown };
      const variantId = row?.variantId === undefined || row?.variantId === null || row?.variantId === "" ? undefined : row.variantId;
      if (!isObjectId(row?.id) || (variantId !== undefined && !isObjectId(variantId))) return jsonError("Cart contains an invalid or duplicate item.", 400);
      const key = lineKey({ id: row.id, variantId });
      if (seen.has(key)) return jsonError("Cart contains an invalid or duplicate item.", 400);
      if (typeof row.quantity !== "number" || !Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > MAX_LINE_QTY) return jsonError("Cart contains an invalid quantity.", 400);
      seen.add(key);
      wanted.push({ id: row.id, ...(variantId ? { variantId } : {}), quantity: row.quantity });
    }
    if (!isMongoConfigured()) return jsonError("Service unavailable", 503);
    await connectMongo();
    const docs = await UnstitchedSuit.find({ _id: { $in: wanted.map((w) => w.id) } }).lean();
    const byId = new Map(docs.map((d) => [String(d._id), d]));

    let subtotalPaise = 0;
    let canCheckout = true;
    const items = wanted.map(({ id, variantId, quantity }) => {
      const d = byId.get(id);
      const ref = { id, ...(variantId ? { variantId } : {}) };
      if (!d) { canCheckout = false; return { ...ref, ok: false, issue: "not_found", quantity }; }
      if (d.status !== "published") { canCheckout = false; return { ...ref, ok: false, issue: "unavailable", quantity }; }
      // Variant suits are bought per variant (own stock). A line without a variant (e.g. added before the suit got
      // variants, or from an older app) or for a removed variant cannot be checked out: the customer re-adds it.
      const v = findVariant(d, variantId);
      if (hasVariants(d) ? !v : Boolean(variantId)) { canCheckout = false; return { ...ref, ok: false, issue: "unavailable", quantity }; }
      const stock = v ? v.stock : d.stock;
      const image = v?.images?.[0]?.url ?? d.fabricImages?.[0]?.url ?? "";
      const base = { ...ref, ...(v ? { variantCode: v.code } : {}), name: d.name, sku: d.sku, image, unitPricePaise: d.salePricePaise, maxQuantity: stock, quantity };
      if (stock <= 0) { canCheckout = false; return { ...base, ok: false, issue: "out_of_stock" }; }
      if (quantity > stock) { canCheckout = false; return { ...base, ok: false, issue: "insufficient_stock" }; }
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
