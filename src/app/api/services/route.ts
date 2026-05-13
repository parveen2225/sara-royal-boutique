import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import Service from "@/models/Service";
import { createSlug, jsonError, jsonMessage, jsonOk } from "@/lib/api/utils";
import { requireAdmin } from "@/lib/auth/guard";
import { getFallbackServices } from "@/lib/fallbackState";

export async function GET(req: NextRequest) {
  const active = req.nextUrl.searchParams.get("active");

  const applyFilter = <T extends { active: boolean }>(items: T[]) => {
    if (active === "true") return items.filter((s) => s.active);
    if (active === "false") return items.filter((s) => !s.active);
    return items;
  };

  if (!isMongoConfigured()) {
    console.warn("[API /services GET] Mongo not configured; serving fallback services");
    return jsonOk(applyFilter(getFallbackServices()));
  }

  try {
    await connectMongo();
    const filter: { active?: boolean } = {};
    if (active === "true") filter.active = true;
    if (active === "false") filter.active = false;
    const services = await Service.find(filter).sort({ createdAt: -1 }).lean();
    console.log("[API /services GET] fetched services", {
      active,
      count: services.length,
    });
    return jsonOk(services);
  } catch (error) {
    console.error("[API /services GET] failed, serving fallback", error);
    return jsonOk(applyFilter(getFallbackServices()));
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
    console.log("[API /services POST] payload received", {
      title: body?.title,
      hasImage: Boolean(body?.imageUrl),
      active: body?.active,
    });
    const title = String(body?.title || "").trim();
    if (!title) return jsonError("Service title is required", 400);

    const service = await Service.create({
      id: String(body?.id || "").trim() || createSlug(title),
      title,
      description: body?.description || "",
      icon: body?.icon || "",
      imageUrl: body?.imageUrl || "",
      imageName: body?.imageName || "",
      active: body?.active ?? true,
    });
    console.log("[API /services POST] service created", { id: service.id, title: service.title });
    return jsonMessage("Service created", service, { status: 201 });
  } catch (error) {
    console.error("[API /services POST] failed", error);
    return jsonError(error instanceof Error ? error.message : "Failed to create service");
  }
}
