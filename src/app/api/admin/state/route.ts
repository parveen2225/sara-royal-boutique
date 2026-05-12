import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import Collection from "@/models/Collection";
import Product from "@/models/Product";
import Service from "@/models/Service";
import { formatProduct, jsonError, jsonMessage, jsonOk } from "@/lib/api/utils";
import { requireAdmin } from "@/lib/auth/guard";
import { getFallbackAdminState } from "@/lib/fallbackState";

async function loadFromMongo() {
  await connectMongo();
  const [collections, products, services] = await Promise.all([
    Collection.find().sort({ createdAt: 1 }).lean(),
    Product.find().sort({ createdAt: -1 }).lean(),
    Service.find().sort({ createdAt: -1 }).lean(),
  ]);
  return { collections, products: products.map(formatProduct), services };
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  if (!isMongoConfigured()) {
    return jsonOk(getFallbackAdminState());
  }

  try {
    return jsonOk(await loadFromMongo());
  } catch {
    return jsonOk(getFallbackAdminState());
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  if (!isMongoConfigured()) {
    return jsonError(
      "MongoDB is not configured. Add a valid MONGODB_URI to .env.local to save data.",
      503,
    );
  }

  try {
    await connectMongo();
    const body = await req.json();
    const collections = Array.isArray(body?.collections) ? body.collections : [];
    const products = Array.isArray(body?.products) ? body.products : [];
    const services = Array.isArray(body?.services) ? body.services : [];

    await Promise.all([Collection.deleteMany({}), Product.deleteMany({}), Service.deleteMany({})]);
    await Promise.all([
      collections.length ? Collection.insertMany(collections) : Promise.resolve(),
      products.length ? Product.insertMany(products) : Promise.resolve(),
      services.length ? Service.insertMany(services) : Promise.resolve(),
    ]);

    return jsonMessage("State updated", await loadFromMongo());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to update admin state");
  }
}
