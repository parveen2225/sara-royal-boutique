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
