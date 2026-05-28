import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import DesignCategory from "@/models/DesignCategory";
import DesignSubcategory from "@/models/DesignSubcategory";
import Design from "@/models/Design";
import {
  createSlug,
  formatDesignCategory,
  jsonError,
  jsonMessage,
  jsonOk,
} from "@/lib/api/utils";
import { requireAdmin } from "@/lib/auth/guard";
import { getFallbackDesignCategories } from "@/data/designStudioFallback";

const parseCategoryBody = (body: Record<string, unknown>) => ({
  name: String(body?.name ?? "").trim(),
  slug: createSlug(String(body?.slug ?? body?.name ?? "")),
  description: String(body?.description ?? "").trim(),
  image: String(body?.image ?? "").trim(),
  displayOrder: Number(body?.displayOrder ?? 0) || 0,
  isActive: body?.isActive !== false,
});

export async function GET(req: NextRequest) {
  const listAll = req.nextUrl.searchParams.get("all") === "true";

  if (listAll) {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;
  }

  if (!isMongoConfigured()) {
    const fallback = getFallbackDesignCategories();
    return jsonOk(listAll ? fallback : fallback.filter((c) => c.isActive));
  }

  try {
    await connectMongo();
    const filter = listAll ? {} : { isActive: true };
    const categories = await DesignCategory.find(filter)
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    const formatted = await Promise.all(
      categories.map(async (cat) => {
        const [subcategoryCount, designCount] = await Promise.all([
          DesignSubcategory.countDocuments({ categoryId: cat._id, ...(listAll ? {} : { isActive: true }) }),
          Design.countDocuments({ categoryId: cat._id, ...(listAll ? {} : { activeStatus: true }) }),
        ]);
        return formatDesignCategory(cat, { subcategoryCount, designCount });
      }),
    );

    if (!listAll && formatted.length === 0) {
      return jsonOk(getFallbackDesignCategories().filter((c) => c.isActive));
    }

    return jsonOk(formatted);
  } catch (error) {
    console.error("[API /design-studio/categories GET]", error);
    const fallback = getFallbackDesignCategories();
    return jsonOk(listAll ? fallback : fallback.filter((c) => c.isActive));
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  if (!isMongoConfigured()) {
    return jsonError("MongoDB is not configured.", 503);
  }

  try {
    await connectMongo();
    const body = await req.json();
    const payload = parseCategoryBody(body);
    if (!payload.name) return jsonError("Category name is required", 400);
    if (!payload.slug) return jsonError("Category slug is required", 400);

    const category = await DesignCategory.create(payload);
    return jsonMessage("Category created", formatDesignCategory(category), { status: 201 });
  } catch (error) {
    console.error("[API /design-studio/categories POST]", error);
    return jsonError(error instanceof Error ? error.message : "Failed to create category");
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
    if (!id) return jsonError("Category id is required", 400);

    const payload = parseCategoryBody(body);
    if (!payload.name) return jsonError("Category name is required", 400);

    const category = await DesignCategory.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!category) return jsonError("Category not found", 404);
    return jsonMessage("Category updated", formatDesignCategory(category));
  } catch (error) {
    console.error("[API /design-studio/categories PUT]", error);
    return jsonError(error instanceof Error ? error.message : "Failed to update category");
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  if (!isMongoConfigured()) return jsonError("MongoDB is not configured.", 503);

  try {
    await connectMongo();
    const id = req.nextUrl.searchParams.get("id")?.trim();
    if (!id) return jsonError("Category id is required", 400);

    const category = await DesignCategory.findByIdAndDelete(id);
    if (!category) return jsonError("Category not found", 404);

    await Promise.all([
      DesignSubcategory.deleteMany({ categoryId: id }),
      Design.deleteMany({ categoryId: id }),
    ]);

    return jsonMessage("Category deleted", formatDesignCategory(category));
  } catch (error) {
    console.error("[API /design-studio/categories DELETE]", error);
    return jsonError(error instanceof Error ? error.message : "Failed to delete category");
  }
}
