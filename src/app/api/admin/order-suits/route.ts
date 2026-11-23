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
    filter.$or = [{ name: rx }, { sku: rx }];
  }
  const docs = await UnstitchedSuit.find(filter).sort({ createdAt: -1 }).limit(15).select("sku name salePricePaise stock status fabricImages").lean();
  return jsonOk(docs.map((d) => ({ id: String(d._id), sku: d.sku, name: d.name, salePricePaise: d.salePricePaise, stock: d.stock, status: d.status, cover: d.fabricImages?.[0]?.url ?? "" })));
}
