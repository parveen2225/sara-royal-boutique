import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import GalleryItem, { GALLERY_CATEGORIES } from "@/models/GalleryItem";
import { formatGalleryItem, jsonError, jsonMessage, jsonOk, type RawDoc } from "@/lib/api/utils";
import { requireAdmin } from "@/lib/auth/guard";
import { getFallbackGalleryResponse } from "@/lib/fallbackState";
import type { GalleryCategory } from "@/lib/admin/types";

const isGalleryCategory = (value: string): value is GalleryCategory =>
  (GALLERY_CATEGORIES as readonly string[]).includes(value);

const parseGalleryBody = (body: Record<string, unknown>) => {
  const category = String(body?.category ?? "").trim();
  return {
    title: String(body?.title ?? "").trim(),
    image: String(body?.image ?? "").trim(),
    category,
    sortOrder: Number(body?.sortOrder ?? 0) || 0,
    isActive: body?.isActive !== false,
  };
};

export async function GET(req: NextRequest) {
  const listAll = req.nextUrl.searchParams.get("all") === "true";
  const category = req.nextUrl.searchParams.get("category")?.trim();

  if (listAll) {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;
  }

  const catFilter =
    category && GALLERY_CATEGORIES.includes(category as GalleryCategory)
      ? (category as GalleryCategory)
      : undefined;

  if (!isMongoConfigured()) {
    return jsonOk(getFallbackGalleryResponse(catFilter));
  }

  try {
    await connectMongo();
    const filter: Record<string, unknown> = listAll ? {} : { isActive: true };
    if (catFilter) {
      filter.category = catFilter;
    }

    const items = await GalleryItem.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    const formatted = items.map((item) => formatGalleryItem(item));
    if (!listAll && formatted.length === 0) {
      return jsonOk(getFallbackGalleryResponse(catFilter));
    }

    return jsonOk({
      items: formatted,
      categories: GALLERY_CATEGORIES,
    });
  } catch (error) {
    console.error("[API /gallery GET] failed", error);
    return jsonOk(getFallbackGalleryResponse(catFilter));
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
    const payload = parseGalleryBody(body);

    if (!payload.image) return jsonError("Gallery image is required", 400);
    if (!isGalleryCategory(payload.category)) {
      return jsonError(`Category must be one of: ${GALLERY_CATEGORIES.join(", ")}`, 400);
    }

    const item = await GalleryItem.create({
      title: payload.title,
      image: payload.image,
      category: payload.category,
      sortOrder: payload.sortOrder,
      isActive: payload.isActive,
    });
    return jsonMessage("Gallery item created", formatGalleryItem(item as unknown as RawDoc), {
      status: 201,
    });
  } catch (error) {
    console.error("[API /gallery POST] failed", error);
    return jsonError(error instanceof Error ? error.message : "Failed to create gallery item");
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
    if (!id) return jsonError("Gallery item id is required", 400);

    const payload = parseGalleryBody(body);
    if (!payload.image) return jsonError("Gallery image is required", 400);
    if (!isGalleryCategory(payload.category)) {
      return jsonError(`Category must be one of: ${GALLERY_CATEGORIES.join(", ")}`, 400);
    }

    const item = await GalleryItem.findByIdAndUpdate(
      id,
      {
        title: payload.title,
        image: payload.image,
        category: payload.category,
        sortOrder: payload.sortOrder,
        isActive: payload.isActive,
      },
      {
        new: true,
        runValidators: true,
      },
    );
    if (!item) return jsonError("Gallery item not found", 404);

    return jsonMessage("Gallery item updated", formatGalleryItem(item as unknown as RawDoc));
  } catch (error) {
    console.error("[API /gallery PUT] failed", error);
    return jsonError(error instanceof Error ? error.message : "Failed to update gallery item");
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
    if (!id) return jsonError("Gallery item id is required", 400);

    const item = await GalleryItem.findByIdAndDelete(id);
    if (!item) return jsonError("Gallery item not found", 404);

    return jsonMessage("Gallery item deleted", formatGalleryItem(item as unknown as RawDoc));
  } catch (error) {
    console.error("[API /gallery DELETE] failed", error);
    return jsonError(error instanceof Error ? error.message : "Failed to delete gallery item");
  }
}
