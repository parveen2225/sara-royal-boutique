import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import Collection from "@/models/Collection";
import Product from "@/models/Product";
import { jsonError, jsonMessage, jsonOk } from "@/lib/api/utils";
import { requireAdmin } from "@/lib/auth/guard";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isMongoConfigured()) return jsonError("MongoDB is not configured", 503);
  try {
    await connectMongo();
    const { id } = await context.params;
    const collection = await Collection.findOne({ id }).lean();
    if (!collection) return jsonError("Collection not found", 404);
    return jsonOk(collection);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to fetch collection");
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  if (!isMongoConfigured()) {
    return jsonError("MongoDB is not configured. Add MONGODB_URI to .env.local to save data.", 503);
  }

  try {
    await connectMongo();
    const body = await req.json();
    const { id } = await context.params;
    const name = String(body?.name || "").trim();
    if (!name) return jsonError("Collection name is required", 400);

    const next: { name: string; serviceId?: string } = { name };
    if (typeof body?.serviceId === "string" && body.serviceId.trim()) {
      next.serviceId = body.serviceId.trim();
    }

    const collection = await Collection.findOneAndUpdate({ id }, next, {
      new: true,
      runValidators: true,
    });
    if (!collection) return jsonError("Collection not found", 404);
    return jsonMessage("Collection updated", collection);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to update collection");
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  if (!isMongoConfigured()) {
    return jsonError("MongoDB is not configured. Add MONGODB_URI to .env.local to save data.", 503);
  }

  try {
    await connectMongo();
    const { id } = await context.params;
    const linked = await Product.exists({ categoryId: id });
    if (linked) return jsonError("Delete products in this collection first", 409);
    const collection = await Collection.findOneAndDelete({ id });
    if (!collection) return jsonError("Collection not found", 404);
    return jsonMessage("Collection deleted", collection);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to delete collection");
  }
}
