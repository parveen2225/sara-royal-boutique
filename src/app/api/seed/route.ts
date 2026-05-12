import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import Collection from "@/models/Collection";
import Product from "@/models/Product";
import Service from "@/models/Service";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requireAdmin } from "@/lib/auth/guard";
import {
  getFallbackCollections,
  getFallbackProducts,
  getFallbackServices,
} from "@/lib/fallbackState";

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  if (!isMongoConfigured()) {
    return jsonError(
      "MongoDB is not configured. Set MONGODB_URI in .env.local before seeding.",
      503,
    );
  }

  try {
    await connectMongo();

    const [existingServices, existingCollections, existingProducts] = await Promise.all([
      Service.countDocuments(),
      Collection.countDocuments(),
      Product.countDocuments(),
    ]);

    const seeded = { services: 0, collections: 0, products: 0 };

    if (existingServices === 0) {
      const services = getFallbackServices().map(({ createdAt: _c, updatedAt: _u, ...rest }) => rest);
      await Service.insertMany(services);
      seeded.services = services.length;
    }

    if (existingCollections === 0) {
      const collections = getFallbackCollections().map(
        ({ createdAt: _c, updatedAt: _u, ...rest }) => rest,
      );
      await Collection.insertMany(collections);
      seeded.collections = collections.length;
    }

    if (existingProducts === 0) {
      const products = getFallbackProducts().map(
        ({ createdAt: _c, updatedAt: _u, ...rest }) => rest,
      );
      await Product.insertMany(products);
      seeded.products = products.length;
    }

    const alreadyHadData =
      existingServices > 0 && existingCollections > 0 && existingProducts > 0;

    return jsonOk({
      message: alreadyHadData
        ? "Database already has data — nothing seeded."
        : `Seeded ${seeded.services} services, ${seeded.collections} collections, ${seeded.products} products.`,
      seeded,
      alreadyHadData,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Seed failed");
  }
}
