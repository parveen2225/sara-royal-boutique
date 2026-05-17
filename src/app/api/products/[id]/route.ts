import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import Product from "@/models/Product";
import { formatProduct, jsonError, jsonMessage, jsonOk } from "@/lib/api/utils";
import { requireAdmin } from "@/lib/auth/guard";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isMongoConfigured()) {
    return jsonError("MongoDB is not configured", 503);
  }
  try {
    await connectMongo();
    const { id } = await context.params;
    const product = await Product.findById(id).lean();
    if (!product) return jsonError("Product not found", 404);
    return jsonOk(formatProduct(product));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to fetch product");
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

    const imageUrls: string[] = Array.isArray(body?.imageUrls)
      ? (body.imageUrls as string[]).filter(Boolean)
      : body?.imageUrl
        ? [String(body.imageUrl)]
        : [];

    const product = await Product.findByIdAndUpdate(
      id,
      {
        name: body?.name,
        description: body?.description,
        stitchingPrice: String(body?.stitchingPrice || "").trim(),
        categoryId: body?.categoryId,
        imageUrl: imageUrls[0] || body?.imageUrl || "",
        imageName: body?.imageName || "",
        imageUrls,
      },
      { new: true, runValidators: true },
    );
    if (!product) return jsonError("Product not found", 404);
    return jsonMessage("Product updated", formatProduct(product));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to update product");
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
    const product = await Product.findByIdAndDelete(id);
    if (!product) return jsonError("Product not found", 404);
    return jsonMessage("Product deleted", formatProduct(product));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to delete product");
  }
}
