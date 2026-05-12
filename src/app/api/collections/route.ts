import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import Collection from "@/models/Collection";
import { createSlug, jsonError, jsonMessage, jsonOk } from "@/lib/api/utils";
import { requireAdmin } from "@/lib/auth/guard";
import { getFallbackCollections } from "@/lib/fallbackState";

export async function GET(req: NextRequest) {
  const serviceId = req.nextUrl.searchParams.get("serviceId");

  if (!isMongoConfigured()) {
    const items = getFallbackCollections().filter(
      (c) => !serviceId || c.serviceId === serviceId,
    );
    return jsonOk(items);
  }

  try {
    await connectMongo();
    const filter = serviceId ? { serviceId } : {};
    const collections = await Collection.find(filter).sort({ createdAt: 1 }).lean();
    return jsonOk(collections);
  } catch {
    const items = getFallbackCollections().filter(
      (c) => !serviceId || c.serviceId === serviceId,
    );
    return jsonOk(items);
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  if (!isMongoConfigured()) {
    return jsonError(
      "MongoDB is not configured. Add MONGODB_URI to .env.local to save data.",
      503,
    );
  }

  try {
    await connectMongo();
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const serviceId = String(body?.serviceId || "").trim();
    if (!name) return jsonError("Collection name is required", 400);
    if (!serviceId) return jsonError("Service is required", 400);

    const collection = await Collection.create({
      id: String(body?.id || "").trim() || createSlug(name),
      name,
      serviceId,
    });
    return jsonMessage("Collection created", collection, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to create collection");
  }
}
