import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import HeroBanner from "@/models/HeroBanner";
import { formatHeroBanner, jsonError, jsonMessage, jsonOk } from "@/lib/api/utils";
import { requireAdmin } from "@/lib/auth/guard";

const parseBannerBody = (body: Record<string, unknown>) => ({
  title: String(body?.title ?? "").trim(),
  subtitle: String(body?.subtitle ?? "").trim(),
  image: String(body?.image ?? "").trim(),
  buttonText: String(body?.buttonText ?? "").trim(),
  buttonLink: String(body?.buttonLink ?? "").trim(),
  isActive: body?.isActive !== false,
});

export async function GET(req: NextRequest) {
  const listAll = req.nextUrl.searchParams.get("all") === "true";

  if (listAll) {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;
  }

  if (!isMongoConfigured()) {
    return jsonOk(listAll ? [] : null);
  }

  try {
    await connectMongo();

    if (listAll) {
      const banners = await HeroBanner.find().sort({ createdAt: -1 }).lean();
      return jsonOk(banners.map((item) => formatHeroBanner(item)));
    }

    const banner = await HeroBanner.findOne({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    return jsonOk(banner ? formatHeroBanner(banner) : null);
  } catch (error) {
    console.error("[API /hero-banner GET] failed", error);
    return jsonOk(listAll ? [] : null);
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
    const payload = parseBannerBody(body);

    if (!payload.image) {
      return jsonError("Hero banner image is required", 400);
    }

    const banner = await HeroBanner.create(payload);
    return jsonMessage("Hero banner created", formatHeroBanner(banner), { status: 201 });
  } catch (error) {
    console.error("[API /hero-banner POST] failed", error);
    return jsonError(error instanceof Error ? error.message : "Failed to create hero banner");
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

    if (!id) {
      return jsonError("Banner id is required", 400);
    }

    const payload = parseBannerBody(body);
    if (!payload.image) {
      return jsonError("Hero banner image is required", 400);
    }

    const banner = await HeroBanner.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    if (!banner) {
      return jsonError("Hero banner not found", 404);
    }

    return jsonMessage("Hero banner updated", formatHeroBanner(banner));
  } catch (error) {
    console.error("[API /hero-banner PUT] failed", error);
    return jsonError(error instanceof Error ? error.message : "Failed to update hero banner");
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

    if (!id) {
      return jsonError("Banner id is required", 400);
    }

    const banner = await HeroBanner.findByIdAndDelete(id);
    if (!banner) {
      return jsonError("Hero banner not found", 404);
    }

    return jsonMessage("Hero banner deleted", formatHeroBanner(banner));
  } catch (error) {
    console.error("[API /hero-banner DELETE] failed", error);
    return jsonError(error instanceof Error ? error.message : "Failed to delete hero banner");
  }
}
