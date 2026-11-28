import type { NextRequest } from "next/server";
import UnstitchedSuit from "@/models/UnstitchedSuit";
import { jsonOk } from "@/lib/api/utils";
import { requirePermission } from "@/lib/auth/permissions";
import { cleanText } from "@/lib/validation";
import { escapeRegex } from "@/lib/suitInput";

export const dynamic = "force-dynamic";

// Minimal suit lookup for the "new order" form, available with only the orders permission (staff on orders do not
// need the products permission). Returns just what is needed to build an order line.
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "orders");
  if (!auth.ok) return auth.response;
  const q = cleanText(req.nextUrl.searchParams.get("q"), 80);
  const filter: Record<string, unknown> = { status: { $ne: "archived" } };
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { sku: rx }, { "variants.code": rx }];
  }
  const docs = await UnstitchedSuit.find(filter).sort({ createdAt: -1 }).limit(15).select("sku name salePricePaise stock status fabricImages variants").lean();
  // A suit with image variants is sold per variant (each has its own stock), so each variant is its own pickable row.
  return jsonOk(docs.flatMap((d) => {
    const base = { id: String(d._id), name: d.name, salePricePaise: d.salePricePaise, status: d.status };
    const variants = (d.variants ?? []) as { _id: unknown; code: string; stock: number; images?: { url: string }[] }[];
    if (variants.length === 0) return [{ ...base, sku: d.sku, stock: d.stock, cover: d.fabricImages?.[0]?.url ?? "" }];
    return variants.map((v) => ({ ...base, variantId: String(v._id), sku: v.code, stock: v.stock, cover: v.images?.[0]?.url ?? d.fabricImages?.[0]?.url ?? "" }));
  }));
}
