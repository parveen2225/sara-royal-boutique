import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import Service from "@/models/Service";
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
    const service = await Service.findOne({ id }).lean();
    if (!service) return jsonError("Service not found", 404);
    return jsonOk(service);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to fetch service");
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
    const service = await Service.findOneAndUpdate(
      { id },
      {
        title: body?.title,
        description: body?.description,
        icon: body?.icon,
        imageUrl: body?.imageUrl,
        imageName: body?.imageName,
        active: body?.active,
      },
      { new: true, runValidators: true },
    );
    if (!service) return jsonError("Service not found", 404);
    return jsonMessage("Service updated", service);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to update service");
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
    const service = await Service.findOneAndDelete({ id });
    if (!service) return jsonError("Service not found", 404);
    return jsonMessage("Service deleted", service);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to delete service");
  }
}
