import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import UnstitchedSuit from "@/models/UnstitchedSuit";
import SuitCategory from "@/models/SuitCategory";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { cleanText, isObjectId } from "@/lib/validation";
import { escapeRegex } from "@/lib/suitInput";
import { toPublicListItem } from "@/lib/publicSuits";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1, _id: -1 },
  price_asc: { salePricePaise: 1, _id: 1 },
  price_desc: { salePricePaise: -1, _id: -1 },
};

// Public catalogue. Only PUBLISHED suits are ever returned; draft and archived suits do not exist as far as this API is concerned.
export async function GET(req: NextRequest) {
  if (!rateLimit(`suits:${clientIp(req.headers)}`, 120, 60_000).allowed) return jsonError("Too many requests", 429);
  const empty = { items: [], total: 0, page: 1, limit: 12, pages: 1 };
  if (!isMongoConfigured()) return jsonOk(empty);
  const p = req.nextUrl.searchParams;
  const sortKey = p.get("sort") ?? "newest";
  if (!SORTS[sortKey]) return jsonError("Invalid sort", 400);
  const limit = Math.min(48, Math.max(1, Math.floor(Number(p.get("limit") ?? 12)) || 12));
  const page = Math.max(1, Math.floor(Number(p.get("page") ?? 1)) || 1);

  try {
    await connectMongo();
    const filter: Record<string, unknown> = { status: "published" };
    const q = cleanText(p.get("q"), 80);
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: rx }, { sku: rx }];
    }
    const category = cleanText(p.get("category"), 80);
    if (category) {
      const cat = isObjectId(category) ? await SuitCategory.findOne({ _id: category, active: true }).select("_id").lean() : await SuitCategory.findOne({ slug: String(category).toLowerCase(), active: true }).select("_id").lean();
      if (!cat) return jsonOk({ ...empty, limit });
      filter.categoryIds = cat._id;
    }
    if (p.get("featured") === "true") filter.featured = true;

    const [total, docs] = await Promise.all([
      UnstitchedSuit.countDocuments(filter),
      UnstitchedSuit.find(filter).sort(SORTS[sortKey]).skip((page - 1) * limit).limit(limit).populate("categoryIds", "name slug active").lean(),
    ]);
    return jsonOk({ items: docs.map((d) => toPublicListItem(d as never)), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    console.error("[API /suits]", error instanceof Error ? error.message : error);
    return jsonError("Could not load suits", 500);
  }
}
