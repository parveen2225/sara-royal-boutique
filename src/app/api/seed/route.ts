import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import Collection from "@/models/Collection";
import GalleryItem from "@/models/GalleryItem";
import Product from "@/models/Product";
import Reel from "@/models/Reel";
import Service from "@/models/Service";
import Testimonial from "@/models/Testimonial";
import { DEFAULT_REELS } from "@/data/reels";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requireAdmin } from "@/lib/auth/guard";
import { DEFAULT_GALLERY_ITEMS } from "@/data/gallery";
import { GOOGLE_REVIEWS } from "@/data/googleReviews";
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

    const [
      existingServices,
      existingCollections,
      existingProducts,
      existingTestimonials,
      existingGallery,
      existingReels,
    ] = await Promise.all([
      Service.countDocuments(),
      Collection.countDocuments(),
      Product.countDocuments(),
      Testimonial.countDocuments(),
      GalleryItem.countDocuments(),
      Reel.countDocuments(),
    ]);

    const seeded = {
      services: 0,
      collections: 0,
      products: 0,
      testimonials: 0,
      gallery: 0,
      reels: 0,
    };

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

    if (existingTestimonials === 0 && GOOGLE_REVIEWS.length > 0) {
      const testimonials = GOOGLE_REVIEWS.map(({ id: _id, ...rest }) => rest);
      await Testimonial.insertMany(testimonials);
      seeded.testimonials = testimonials.length;
    }

    if (existingGallery === 0) {
      const gallery = DEFAULT_GALLERY_ITEMS.map(({ id: _id, ...rest }) => rest);
      await GalleryItem.insertMany(gallery);
      seeded.gallery = gallery.length;
    }

    if (existingReels === 0) {
      const reels = DEFAULT_REELS.map(({ id: _id, ...rest }) => rest);
      await Reel.insertMany(reels);
      seeded.reels = reels.length;
    }

    const alreadyHadData =
      existingServices > 0 &&
      existingCollections > 0 &&
      existingProducts > 0 &&
      existingTestimonials > 0 &&
      existingGallery > 0 &&
      existingReels > 0;

    return jsonOk({
      message: alreadyHadData
        ? "Database already has data — nothing seeded."
        : `Seeded ${seeded.services} services, ${seeded.collections} collections, ${seeded.products} products, ${seeded.testimonials} testimonials, ${seeded.gallery} gallery items, ${seeded.reels} reels.`,
      seeded,
      alreadyHadData,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Seed failed");
  }
}
