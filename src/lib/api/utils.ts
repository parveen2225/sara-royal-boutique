import { NextResponse } from "next/server";

export const createSlug = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const jsonOk = (data: unknown, init: ResponseInit = {}) =>
  NextResponse.json({ data }, init);

export const jsonMessage = (message: string, data?: unknown, init: ResponseInit = {}) =>
  NextResponse.json({ message, ...(data === undefined ? {} : { data }) }, init);

export const jsonError = (message: string, status = 500) =>
  NextResponse.json({ message }, { status });

export type RawDoc = Record<string, unknown> & {
  toObject?: () => Record<string, unknown>;
  _id?: { toString(): string };
  id?: string;
};

export const formatProduct = (product: RawDoc) => {
  const item = typeof product?.toObject === "function" ? product.toObject() : product;
  return {
    ...item,
    id: (item?.id as string) || item?._id?.toString() || "",
  };
};

export const formatHeroBanner = (banner: RawDoc) => {
  const item = typeof banner?.toObject === "function" ? banner.toObject() : banner;
  return {
    id: (item?.id as string) || item?._id?.toString() || "",
    title: String(item?.title ?? ""),
    subtitle: String(item?.subtitle ?? ""),
    image: String(item?.image ?? ""),
    buttonText: String(item?.buttonText ?? ""),
    buttonLink: String(item?.buttonLink ?? ""),
    isActive: Boolean(item?.isActive ?? true),
    createdAt: item?.createdAt,
    updatedAt: item?.updatedAt,
  };
};

export const formatReel = (reel: unknown) => {
  const doc = reel as RawDoc;
  const item = typeof doc?.toObject === "function" ? doc.toObject() : doc;
  return {
    id: (item?.id as string) || item?._id?.toString() || "",
    title: String(item?.title ?? ""),
    instagramUrl: String(item?.instagramUrl ?? ""),
    thumbnail: String(item?.thumbnail ?? ""),
    sortOrder: Number(item?.sortOrder ?? 0),
    isActive: Boolean(item?.isActive ?? true),
    createdAt: item?.createdAt,
    updatedAt: item?.updatedAt,
  };
};

export const formatTestimonial = (testimonial: unknown) => {
  const doc = testimonial as RawDoc;
  const item = typeof doc?.toObject === "function" ? doc.toObject() : doc;
  return {
    id: (item?.id as string) || item?._id?.toString() || "",
    customerName: String(item?.customerName ?? ""),
    reviewText: String(item?.reviewText ?? ""),
    rating: Math.min(5, Math.max(1, Number(item?.rating ?? 5))),
    image: String(item?.image ?? ""),
    sortOrder: Number(item?.sortOrder ?? 0),
    isActive: Boolean(item?.isActive ?? true),
    createdAt: item?.createdAt,
    updatedAt: item?.updatedAt,
  };
};

export const formatGalleryItem = (galleryItem: unknown) => {
  const doc = galleryItem as RawDoc;
  const item = typeof doc?.toObject === "function" ? doc.toObject() : doc;
  return {
    id: (item?.id as string) || item?._id?.toString() || "",
    title: String(item?.title ?? ""),
    image: String(item?.image ?? ""),
    category: String(item?.category ?? ""),
    sortOrder: Number(item?.sortOrder ?? 0),
    isActive: Boolean(item?.isActive ?? true),
    createdAt: item?.createdAt,
    updatedAt: item?.updatedAt,
  };
};

type PopulatedRef = {
  _id?: { toString(): string };
  name?: string;
  slug?: string;
};

const refId = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "_id" in value) {
    return (value as PopulatedRef)._id?.toString() ?? "";
  }
  return String(value);
};

const refField = (value: unknown, field: "name" | "slug") => {
  if (value && typeof value === "object" && field in value) {
    return String((value as PopulatedRef)[field] ?? "");
  }
  return "";
};

export const formatDesignCategory = (doc: unknown, counts?: { subcategoryCount?: number; designCount?: number }) => {
  const item = typeof (doc as RawDoc)?.toObject === "function" ? (doc as RawDoc).toObject!() : (doc as RawDoc);
  return {
    id: (item?.id as string) || item?._id?.toString() || "",
    name: String(item?.name ?? ""),
    slug: String(item?.slug ?? ""),
    description: String(item?.description ?? ""),
    image: String(item?.image ?? ""),
    displayOrder: Number(item?.displayOrder ?? 0),
    isActive: Boolean(item?.isActive ?? true),
    subcategoryCount: counts?.subcategoryCount ?? 0,
    designCount: counts?.designCount ?? 0,
    createdAt: item?.createdAt,
    updatedAt: item?.updatedAt,
  };
};

export const formatDesignSubcategory = (
  doc: unknown,
  extras?: { categorySlug?: string; categoryName?: string; designCount?: number },
) => {
  const item = typeof (doc as RawDoc)?.toObject === "function" ? (doc as RawDoc).toObject!() : (doc as RawDoc);
  const category = item?.categoryId as PopulatedRef | string | undefined;
  return {
    id: (item?.id as string) || item?._id?.toString() || "",
    categoryId: refId(category),
    categorySlug: extras?.categorySlug || refField(category, "slug"),
    categoryName: extras?.categoryName || refField(category, "name"),
    name: String(item?.name ?? ""),
    slug: String(item?.slug ?? ""),
    description: String(item?.description ?? ""),
    image: String(item?.image ?? ""),
    displayOrder: Number(item?.displayOrder ?? 0),
    isActive: Boolean(item?.isActive ?? true),
    designCount: extras?.designCount ?? 0,
    createdAt: item?.createdAt,
    updatedAt: item?.updatedAt,
  };
};

export const formatStudioDesign = (doc: unknown) => {
  const item = typeof (doc as RawDoc)?.toObject === "function" ? (doc as RawDoc).toObject!() : (doc as RawDoc);
  const category = item?.categoryId as PopulatedRef | string | undefined;
  const subcategory = item?.subcategoryId as PopulatedRef | string | undefined;
  const galleryImages = Array.isArray(item?.galleryImages)
    ? (item.galleryImages as string[]).map(String)
    : [];

  return {
    id: (item?.id as string) || item?._id?.toString() || "",
    title: String(item?.title ?? ""),
    slug: String(item?.slug ?? ""),
    categoryId: refId(category),
    categorySlug: refField(category, "slug"),
    categoryName: refField(category, "name"),
    subcategoryId: refId(subcategory),
    subcategorySlug: refField(subcategory, "slug"),
    subcategoryName: refField(subcategory, "name"),
    shortDescription: String(item?.shortDescription ?? ""),
    fullDescription: String(item?.fullDescription ?? ""),
    thumbnailImage: String(item?.thumbnailImage ?? ""),
    galleryImages,
    tags: Array.isArray(item?.tags) ? (item.tags as string[]).map(String) : [],
    stitchingPrice: String(item?.stitchingPrice ?? ""),
    fabricRecommendation: String(item?.fabricRecommendation ?? ""),
    deliveryTimeline: String(item?.deliveryTimeline ?? ""),
    featured: Boolean(item?.featured),
    trending: Boolean(item?.trending),
    newArrival: Boolean(item?.newArrival),
    bridalSpecial: Boolean(item?.bridalSpecial),
    homepageShow: Boolean(item?.homepageShow),
    activeStatus: Boolean(item?.activeStatus ?? true),
    displayOrder: Number(item?.displayOrder ?? 0),
    seoTitle: String(item?.seoTitle ?? ""),
    seoDescription: String(item?.seoDescription ?? ""),
    seoKeywords: String(item?.seoKeywords ?? ""),
    createdAt: item?.createdAt,
    updatedAt: item?.updatedAt,
  };
};
