import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import Testimonial from "@/models/Testimonial";
import { formatTestimonial, jsonError, jsonMessage, jsonOk } from "@/lib/api/utils";
import { requireAdmin } from "@/lib/auth/guard";
import { getStoredTestimonials } from "@/lib/testimonials/store";

const parseTestimonialBody = (body: Record<string, unknown>) => {
  const rating = Math.min(5, Math.max(1, Number(body?.rating ?? 5) || 5));
  return {
    customerName: String(body?.customerName ?? "").trim(),
    reviewText: String(body?.reviewText ?? "").trim(),
    rating,
    image: String(body?.image ?? "").trim(),
    sortOrder: Number(body?.sortOrder ?? 0) || 0,
    isActive: body?.isActive !== false,
  };
};

export async function GET(req: NextRequest) {
  const listAll = req.nextUrl.searchParams.get("all") === "true";

  if (listAll) {
    const auth = requireAdmin(req);
    if (!auth.ok) return auth.response;
  }

  const items = await getStoredTestimonials({ includeInactive: listAll });
  return jsonOk(items);
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
    const payload = parseTestimonialBody(body);

    if (!payload.customerName) return jsonError("Customer name is required", 400);
    if (!payload.reviewText) return jsonError("Review text is required", 400);

    const item = await Testimonial.create(payload);
    return jsonMessage("Testimonial created", formatTestimonial(item), { status: 201 });
  } catch (error) {
    console.error("[API /testimonials POST] failed", error);
    return jsonError(error instanceof Error ? error.message : "Failed to create testimonial");
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  if (!isMongoConfigured()) {
    return jsonError("MongoDB is not configured. Add MONGODB_URI to .env.local to save data.", 503);
  }

  try {
    await connectMongo();
    const body = await req.json();
    const id = String(body?.id ?? "").trim();
    if (!id) return jsonError("Testimonial id is required", 400);

    const payload = parseTestimonialBody(body);
    if (!payload.customerName) return jsonError("Customer name is required", 400);
    if (!payload.reviewText) return jsonError("Review text is required", 400);

    const item = await Testimonial.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!item) return jsonError("Testimonial not found", 404);

    return jsonMessage("Testimonial updated", formatTestimonial(item));
  } catch (error) {
    console.error("[API /testimonials PUT] failed", error);
    return jsonError(error instanceof Error ? error.message : "Failed to update testimonial");
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  if (!isMongoConfigured()) {
    return jsonError("MongoDB is not configured. Add MONGODB_URI to .env.local to save data.", 503);
  }

  try {
    await connectMongo();
    const id = req.nextUrl.searchParams.get("id")?.trim();
    if (!id) return jsonError("Testimonial id is required", 400);

    const item = await Testimonial.findByIdAndDelete(id);
    if (!item) return jsonError("Testimonial not found", 404);

    return jsonMessage("Testimonial deleted", formatTestimonial(item));
  } catch (error) {
    console.error("[API /testimonials DELETE] failed", error);
    return jsonError(error instanceof Error ? error.message : "Failed to delete testimonial");
  }
}
