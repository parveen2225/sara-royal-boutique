import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import Product from "@/models/Product";
import { formatProduct, jsonError, jsonMessage, jsonOk } from "@/lib/api/utils";
import { requireAdmin } from "@/lib/auth/guard";
import { getFallbackProducts } from "@/lib/fallbackState";

export async function GET(req: NextRequest) {
  const categoryId = req.nextUrl.searchParams.get("categoryId");

  if (!isMongoConfigured()) {
    const products = getFallbackProducts().filter(
      (p) => !categoryId || p.categoryId === categoryId,
    );
    return jsonOk(products);
  }

  try {
    await connectMongo();
    const filter = categoryId ? { categoryId } : {};
    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
    return jsonOk(products.map(formatProduct));
  } catch {
    const products = getFallbackProducts().filter(
      (p) => !categoryId || p.categoryId === categoryId,
    );
    return jsonOk(products);
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
    const name = String(body?.name || "").trim();
    const categoryId = String(body?.categoryId || "").trim();
    if (!name) return jsonError("Product name is required", 400);
    if (!categoryId) return jsonError("Category is required", 400);

    const imageUrls: string[] = Array.isArray(body?.imageUrls)
      ? (body.imageUrls as string[]).filter(Boolean)
      : body?.imageUrl
        ? [String(body.imageUrl)]
        : [];

    const product = await Product.create({
      name,
      description: body?.description || "",
      stitchingPrice: body?.stitchingPrice || 0,
      categoryId,
      imageUrl: imageUrls[0] || body?.imageUrl || "",
      imageName: body?.imageName || "",
      imageUrls,
    });
    return jsonMessage("Product created", formatProduct(product), { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to create product");
  }
}
