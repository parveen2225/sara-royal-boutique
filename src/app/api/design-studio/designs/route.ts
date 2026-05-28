import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import DesignCategory from "@/models/DesignCategory";
import DesignSubcategory from "@/models/DesignSubcategory";
import Design from "@/models/Design";
import {
  createSlug,
  formatStudioDesign,
  jsonError,
  jsonMessage,
  jsonOk,
} from "@/lib/api/utils";
import { requireAdmin } from "@/lib/auth/guard";
import { getFallbackDesigns, getFallbackDesignBySlug } from "@/data/designStudioFallback";

const parseDesignBody = (body: Record<string, unknown>) => ({
  title: String(body?.title ?? "").trim(),
  slug: createSlug(String(body?.slug ?? body?.title ?? "")),
  categoryId: String(body?.categoryId ?? "").trim(),
  subcategoryId: String(body?.subcategoryId ?? "").trim(),
  shortDescription: String(body?.shortDescription ?? "").trim(),
  fullDescription: String(body?.fullDescription ?? "").trim(),
  thumbnailImage: String(body?.thumbnailImage ?? "").trim(),
  galleryImages: Array.isArray(body?.galleryImages)
    ? (body.galleryImages as unknown[]).map(String).filter(Boolean)
    : [],
  tags: Array.isArray(body?.tags)
    ? (body.tags as unknown[]).map(String).filter(Boolean)
    : String(body?.tags ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
  stitchingPrice: String(body?.stitchingPrice ?? "").trim(),
  fabricRecommendation: String(body?.fabricRecommendation ?? "").trim(),
  deliveryTimeline: String(body?.deliveryTimeline ?? "").trim(),
  featured: Boolean(body?.featured),
  trending: Boolean(body?.trending),
  newArrival: Boolean(body?.newArrival),
  bridalSpecial: Boolean(body?.bridalSpecial),
  homepageShow: Boolean(body?.homepageShow),
  activeStatus: body?.activeStatus !== false,
  displayOrder: Number(body?.displayOrder ?? 0) || 0,
  seoTitle: String(body?.seoTitle ?? "").trim(),
  seoDescription: String(body?.seoDescription ?? "").trim(),
  seoKeywords: String(body?.seoKeywords ?? "").trim(),
});

const buildPublicFilter = async (params: URLSearchParams, listAll: boolean) => {
  const filter: Record<string, unknown> = listAll ? {} : { activeStatus: true };

  const categorySlug = params.get("category")?.trim();
  const subcategorySlug = params.get("subcategory")?.trim();
  const categoryId = params.get("categoryId")?.trim();
  const subcategoryId = params.get("subcategoryId")?.trim();

  if (categoryId) filter.categoryId = categoryId;
  else if (categorySlug) {
    const cat = await DesignCategory.findOne({ slug: categorySlug }).lean();
    if (cat?._id) filter.categoryId = cat._id;
  }

  if (subcategoryId) filter.subcategoryId = subcategoryId;
  else if (subcategorySlug) {
    const subFilter: Record<string, unknown> = { slug: subcategorySlug };
    if (filter.categoryId) subFilter.categoryId = filter.categoryId;
    const sub = await DesignSubcategory.findOne(subFilter).lean();
    if (sub?._id) filter.subcategoryId = sub._id;
  }

  if (params.get("featured") === "true") filter.featured = true;
  if (params.get("trending") === "true") filter.trending = true;
  if (params.get("bridal") === "true") filter.bridalSpecial = true;
  if (params.get("newArrival") === "true") filter.newArrival = true;
  if (params.get("homepageShow") === "true") filter.homepageShow = true;

  const search = params.get("search")?.trim().toLowerCase();
  return { filter, search };
};

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const listAll = params.get("all") === "true";
  const slug = params.get("slug")?.trim();

  if (listAll) {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;
  }

  if (!isMongoConfigured()) {
    if (slug) {
      const design = getFallbackDesignBySlug(slug);
      return design ? jsonOk(design) : jsonError("Design not found", 404);
    }
    const designs = getFallbackDesigns({
      categorySlug: params.get("category")?.trim(),
      subcategorySlug: params.get("subcategory")?.trim(),
      search: params.get("search")?.trim(),
      featured: params.get("featured") === "true",
      trending: params.get("trending") === "true",
      bridal: params.get("bridal") === "true",
      newArrival: params.get("newArrival") === "true",
      homepageShow: params.get("homepageShow") === "true",
      limit: params.get("limit") ? Number(params.get("limit")) : undefined,
    });
    return jsonOk(designs);
  }

  try {
    await connectMongo();

    if (slug) {
      const design = await Design.findOne({ slug, ...(listAll ? {} : { activeStatus: true }) })
        .populate("categoryId", "name slug")
        .populate("subcategoryId", "name slug")
        .lean();
      if (!design) {
        const fallback = getFallbackDesignBySlug(slug);
        return fallback ? jsonOk(formatStudioDesign(fallback)) : jsonError("Design not found", 404);
      }
      return jsonOk(formatStudioDesign(design));
    }

    const { filter, search } = await buildPublicFilter(params, listAll);
    let designs = await Design.find(filter)
      .populate("categoryId", "name slug")
      .populate("subcategoryId", "name slug")
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    if (search) {
      designs = designs.filter((d) => {
        const title = String(d.title ?? "").toLowerCase();
        const tags = (d.tags as string[] | undefined)?.join(" ").toLowerCase() ?? "";
        return title.includes(search) || tags.includes(search);
      });
    }

    const limit = params.get("limit");
    if (limit) designs = designs.slice(0, Number(limit) || 20);

    const formatted = designs.map((d) => formatStudioDesign(d));

    if (!listAll && formatted.length === 0) {
      return jsonOk(
        getFallbackDesigns({
          categorySlug: params.get("category")?.trim(),
          subcategorySlug: params.get("subcategory")?.trim(),
          search: params.get("search")?.trim(),
          featured: params.get("featured") === "true",
          trending: params.get("trending") === "true",
          bridal: params.get("bridal") === "true",
          newArrival: params.get("newArrival") === "true",
          homepageShow: params.get("homepageShow") === "true",
        }),
      );
    }

    return jsonOk(formatted);
  } catch (error) {
    console.error("[API /design-studio/designs GET]", error);
    return jsonOk(
      getFallbackDesigns({
        categorySlug: params.get("category")?.trim(),
        subcategorySlug: params.get("subcategory")?.trim(),
      }),
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  if (!isMongoConfigured()) return jsonError("MongoDB is not configured.", 503);

  try {
    await connectMongo();
    const body = await req.json();
    const duplicateId = String(body?.duplicateId ?? "").trim();

    if (duplicateId) {
      const source = await Design.findById(duplicateId).lean();
      if (!source) return jsonError("Source design not found", 404);

      const copySlug = createSlug(`${source.slug}-copy-${Date.now()}`);
      const { _id, createdAt, updatedAt, ...rest } = source as Record<string, unknown>;
      const copy = await Design.create({
        ...rest,
        title: `${source.title} (Copy)`,
        slug: copySlug,
        featured: false,
        trending: false,
        homepageShow: false,
      });
      await copy.populate(["categoryId", "subcategoryId"]);
      return jsonMessage("Design duplicated", formatStudioDesign(copy), { status: 201 });
    }

    const payload = parseDesignBody(body);
    if (!payload.title) return jsonError("Design title is required", 400);
    if (!payload.thumbnailImage) return jsonError("Thumbnail image is required", 400);
    if (!payload.categoryId) return jsonError("Category is required", 400);
    if (!payload.subcategoryId) return jsonError("Subcategory is required", 400);

    const design = await Design.create(payload);
    await design.populate(["categoryId", "subcategoryId"]);
    return jsonMessage("Design created", formatStudioDesign(design), { status: 201 });
  } catch (error) {
    console.error("[API /design-studio/designs POST]", error);
    return jsonError(error instanceof Error ? error.message : "Failed to create design");
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
    if (!id) return jsonError("Design id is required", 400);

    const payload = parseDesignBody(body);
    if (!payload.title) return jsonError("Design title is required", 400);
    if (!payload.thumbnailImage) return jsonError("Thumbnail image is required", 400);

    const design = await Design.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    })
      .populate("categoryId", "name slug")
      .populate("subcategoryId", "name slug");
    if (!design) return jsonError("Design not found", 404);
    return jsonMessage("Design updated", formatStudioDesign(design));
  } catch (error) {
    console.error("[API /design-studio/designs PUT]", error);
    return jsonError(error instanceof Error ? error.message : "Failed to update design");
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  if (!isMongoConfigured()) return jsonError("MongoDB is not configured.", 503);

  try {
    await connectMongo();
    const id = req.nextUrl.searchParams.get("id")?.trim();
    if (!id) return jsonError("Design id is required", 400);

    const design = await Design.findByIdAndDelete(id);
    if (!design) return jsonError("Design not found", 404);
    return jsonMessage("Design deleted", formatStudioDesign(design));
  } catch (error) {
    console.error("[API /design-studio/designs DELETE]", error);
    return jsonError(error instanceof Error ? error.message : "Failed to delete design");
  }
}
