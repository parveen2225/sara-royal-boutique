import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import UnstitchedSuit from "@/models/UnstitchedSuit";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { isObjectId } from "@/lib/validation";
import { toPublicDetail, toPublicListItem } from "@/lib/publicSuits";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

// Suit by id or SKU ("SR-0001"). Draft / archived / unknown all look identical: 404.
export async function GET(req: NextRequest, { params }: Ctx) {
  if (!rateLimit(`suit:${clientIp(req.headers)}`, 120, 60_000).allowed) return jsonError("Too many requests", 429);
  const { id } = await params;
  if (!isMongoConfigured()) return jsonError("Suit not found", 404);
  const key = decodeURIComponent(id).trim();
  const lookup = isObjectId(key) ? { _id: key } : /^SR-\d{4,}$/i.test(key) ? { sku: String(key).toUpperCase() } : null;
  if (!lookup) return jsonError("Suit not found", 404);
  try {
    await connectMongo();
    const suit = await UnstitchedSuit.findOne({ ...lookup, status: "published" }).populate("categoryIds", "name slug active").lean();
    if (!suit) return jsonError("Suit not found", 404);
    const catIds = (suit.categoryIds as unknown as { _id: unknown }[]).map((c) => c._id);
    const related = await UnstitchedSuit.find({ status: "published", _id: { $ne: suit._id }, ...(catIds.length ? { categoryIds: { $in: catIds } } : {}) })
      .sort({ createdAt: -1 }).limit(4).populate("categoryIds", "name slug active").lean();
    return jsonOk({ ...toPublicDetail(suit as never), related: related.map((r) => toPublicListItem(r as never)) });
  } catch (error) {
    console.error("[API /suits/:id]", error instanceof Error ? error.message : error);
    return jsonError("Could not load suit", 500);
  }
}
