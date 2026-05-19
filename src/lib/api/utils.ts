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

type RawDoc = Record<string, unknown> & {
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
