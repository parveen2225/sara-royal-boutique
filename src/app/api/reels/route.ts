import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import Reel from "@/models/Reel";
import { formatReel, jsonError, jsonMessage, jsonOk } from "@/lib/api/utils";
import { requireAdmin } from "@/lib/auth/guard";
import { getFallbackReels } from "@/lib/fallbackState";

const parseReelBody = (body: Record<string, unknown>) => ({
  title: String(body?.title ?? "").trim(),
  instagramUrl: String(body?.instagramUrl ?? "").trim(),
  thumbnail: String(body?.thumbnail ?? "").trim(),
  sortOrder: Number(body?.sortOrder ?? 0) || 0,
  isActive: body?.isActive !== false,
});

export async function GET(req: NextRequest) {
  const listAll = req.nextUrl.searchParams.get("all") === "true";

  if (listAll) {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;
  }

  if (!isMongoConfigured()) {
    return jsonOk(listAll ? [] : getFallbackReels());
  }

  try {
    await connectMongo();
    const filter = listAll ? {} : { isActive: true };
    const reels = await Reel.find(filter).sort({ sortOrder: 1, createdAt: -1 }).lean();
    const formatted = reels.map((item) => formatReel(item));

    if (!listAll && formatted.length === 0) {
      return jsonOk(getFallbackReels());
    }

    return jsonOk(formatted);
  } catch (error) {
    console.error("[API /reels GET] failed", error);
    return jsonOk(listAll ? [] : getFallbackReels());
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  if (!isMongoConfigured()) {
    return jsonError("MongoDB is not configured. Add MONGODB_URI to .env.local to save data.", 503);
  }

  try {
    await connectMongo();
    const body = await req.json();
    const payload = parseReelBody(body);

    if (!payload.title) return jsonError("Reel title is required", 400);
    if (!payload.instagramUrl) return jsonError("Instagram reel URL is required", 400);
    if (!payload.thumbnail) return jsonError("Thumbnail image is required", 400);

    const reel = await Reel.create(payload);
    return jsonMessage("Reel created", formatReel(reel), { status: 201 });
  } catch (error) {
    console.error("[API /reels POST] failed", error);
    return jsonError(error instanceof Error ? error.message : "Failed to create reel");
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  if (!isMongoConfigured()) {
    return jsonError("MongoDB is not configured. Add MONGODB_URI to .env.local to save data.", 503);
  }

  try {
    await connectMongo();
    const body = await req.json();
    const id = String(body?.id ?? "").trim();

    if (!id) return jsonError("Reel id is required", 400);

    const payload = parseReelBody(body);
    if (!payload.title) return jsonError("Reel title is required", 400);
    if (!payload.instagramUrl) return jsonError("Instagram reel URL is required", 400);
    if (!payload.thumbnail) return jsonError("Thumbnail image is required", 400);

    const reel = await Reel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    if (!reel) return jsonError("Reel not found", 404);

    return jsonMessage("Reel updated", formatReel(reel));
  } catch (error) {
    console.error("[API /reels PUT] failed", error);
    return jsonError(error instanceof Error ? error.message : "Failed to update reel");
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  if (!isMongoConfigured()) {
    return jsonError("MongoDB is not configured. Add MONGODB_URI to .env.local to save data.", 503);
  }

  try {
    await connectMongo();
    const id = req.nextUrl.searchParams.get("id")?.trim();
    if (!id) return jsonError("Reel id is required", 400);

    const reel = await Reel.findByIdAndDelete(id);
    if (!reel) return jsonError("Reel not found", 404);

    return jsonMessage("Reel deleted", formatReel(reel));
  } catch (error) {
    console.error("[API /reels DELETE] failed", error);
    return jsonError(error instanceof Error ? error.message : "Failed to delete reel");
  }
}
