import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import DesignCategory from "@/models/DesignCategory";
import DesignSubcategory from "@/models/DesignSubcategory";
import Design from "@/models/Design";
import {
  createSlug,
  formatDesignSubcategory,
  jsonError,
  jsonMessage,
  jsonOk,
} from "@/lib/api/utils";
import { requireAdmin } from "@/lib/auth/guard";
import { getFallbackDesignSubcategories } from "@/data/designStudioFallback";

const parseSubcategoryBody = (body: Record<string, unknown>) => ({
  categoryId: String(body?.categoryId ?? "").trim(),
  name: String(body?.name ?? "").trim(),
  slug: createSlug(String(body?.slug ?? body?.name ?? "")),
  description: String(body?.description ?? "").trim(),
  image: String(body?.image ?? "").trim(),
  displayOrder: Number(body?.displayOrder ?? 0) || 0,
  isActive: body?.isActive !== false,
});

export async function GET(req: NextRequest) {
  const listAll = req.nextUrl.searchParams.get("all") === "true";
  const categorySlug = req.nextUrl.searchParams.get("category")?.trim();
  const categoryId = req.nextUrl.searchParams.get("categoryId")?.trim();

  if (listAll) {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;
  }

  if (!isMongoConfigured()) {
    let fallback = getFallbackDesignSubcategories(categorySlug || undefined);
    if (!listAll) fallback = fallback.filter((s) => s.isActive);
    return jsonOk(fallback);
  }

  try {
    await connectMongo();

    let resolvedCategoryId = categoryId;
    if (categorySlug && !resolvedCategoryId) {
      const cat = await DesignCategory.findOne({ slug: categorySlug }).lean();
      resolvedCategoryId = cat?._id?.toString();
    }

    const filter: Record<string, unknown> = listAll ? {} : { isActive: true };
    if (resolvedCategoryId) filter.categoryId = resolvedCategoryId;

    const subcategories = await DesignSubcategory.find(filter)
      .populate("categoryId", "name slug")
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    const formatted = await Promise.all(
      subcategories.map(async (sub) => {
        const designCount = await Design.countDocuments({
          subcategoryId: sub._id,
          ...(listAll ? {} : { activeStatus: true }),
        });
        return formatDesignSubcategory(sub, { designCount });
      }),
    );

    if (!listAll && formatted.length === 0 && categorySlug) {
      return jsonOk(getFallbackDesignSubcategories(categorySlug).filter((s) => s.isActive));
    }

    return jsonOk(formatted);
  } catch (error) {
    console.error("[API /design-studio/subcategories GET]", error);
    let fallback = getFallbackDesignSubcategories(categorySlug || undefined);
    if (!listAll) fallback = fallback.filter((s) => s.isActive);
    return jsonOk(fallback);
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  if (!isMongoConfigured()) return jsonError("MongoDB is not configured.", 503);

  try {
    await connectMongo();
    const body = await req.json();
    const payload = parseSubcategoryBody(body);
    if (!payload.categoryId) return jsonError("Category is required", 400);
    if (!payload.name) return jsonError("Subcategory name is required", 400);

    const subcategory = await DesignSubcategory.create(payload);
    await subcategory.populate("categoryId", "name slug");
    return jsonMessage("Subcategory created", formatDesignSubcategory(subcategory), { status: 201 });
  } catch (error) {
    console.error("[API /design-studio/subcategories POST]", error);
    return jsonError(error instanceof Error ? error.message : "Failed to create subcategory");
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  if (!isMongoConfigured()) return jsonError("MongoDB is not configured.", 503);

  try {
    await connectMongo();
    const body = await req.json();
    const id = String(body?.id ?? "").trim();
    if (!id) return jsonError("Subcategory id is required", 400);

    const payload = parseSubcategoryBody(body);
    if (!payload.categoryId) return jsonError("Category is required", 400);
    if (!payload.name) return jsonError("Subcategory name is required", 400);

    const subcategory = await DesignSubcategory.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    }).populate("categoryId", "name slug");
    if (!subcategory) return jsonError("Subcategory not found", 404);
    return jsonMessage("Subcategory updated", formatDesignSubcategory(subcategory));
  } catch (error) {
    console.error("[API /design-studio/subcategories PUT]", error);
    return jsonError(error instanceof Error ? error.message : "Failed to update subcategory");
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  if (!isMongoConfigured()) return jsonError("MongoDB is not configured.", 503);

  try {
    await connectMongo();
    const id = req.nextUrl.searchParams.get("id")?.trim();
    if (!id) return jsonError("Subcategory id is required", 400);

    const subcategory = await DesignSubcategory.findByIdAndDelete(id);
    if (!subcategory) return jsonError("Subcategory not found", 404);

    await Design.deleteMany({ subcategoryId: id });
    return jsonMessage("Subcategory deleted", formatDesignSubcategory(subcategory));
  } catch (error) {
    console.error("[API /design-studio/subcategories DELETE]", error);
    return jsonError(error instanceof Error ? error.message : "Failed to delete subcategory");
  }
}
