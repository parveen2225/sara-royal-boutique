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
    console.warn("[API /admin/state GET] Mongo not configured; serving fallback admin state");
    return jsonOk(getFallbackAdminState());
  }

  try {
    const data = await loadFromMongo();
    console.log("[API /admin/state GET] fetched admin state", {
      services: data.services.length,
      collections: data.collections.length,
      products: data.products.length,
    });
    return jsonOk(data);
  } catch (error) {
    console.error("[API /admin/state GET] failed to load from Mongo", error);
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
    console.log("[API /admin/state PUT] replacing admin state", {
      services: services.length,
      collections: collections.length,
      products: products.length,
    });

    await Promise.all([Collection.deleteMany({}), Product.deleteMany({}), Service.deleteMany({})]);
    await Promise.all([
      collections.length ? Collection.insertMany(collections) : Promise.resolve(),
      products.length ? Product.insertMany(products) : Promise.resolve(),
      services.length ? Service.insertMany(services) : Promise.resolve(),
    ]);

    return jsonMessage("State updated", await loadFromMongo());
  } catch (error) {
    console.error("[API /admin/state PUT] failed", error);
    return jsonError(error instanceof Error ? error.message : "Failed to update admin state");
  }
}
