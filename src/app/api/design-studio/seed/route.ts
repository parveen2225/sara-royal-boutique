import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import DesignCategory from "@/models/DesignCategory";
import DesignSubcategory from "@/models/DesignSubcategory";
import Design from "@/models/Design";
import { createSlug, jsonError, jsonOk } from "@/lib/api/utils";
import { requireAdmin } from "@/lib/auth/guard";
import {
  DESIGN_STUDIO_CATALOG,
  DESIGN_STUDIO_IMAGES,
} from "@/data/designStudioCatalog";

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  if (!isMongoConfigured()) {
    return jsonError("MongoDB is not configured. Set MONGODB_URI in .env.local.", 503);
  }

  try {
    await connectMongo();

    const existing = await DesignCategory.countDocuments();
    if (existing > 0) {
      return jsonOk({
        message: "Design Studio already seeded",
        categories: existing,
        subcategories: await DesignSubcategory.countDocuments(),
        designs: await Design.countDocuments(),
      });
    }

    let designIndex = 0;
    let categoriesCreated = 0;
    let subcategoriesCreated = 0;
    let designsCreated = 0;

    for (const [catIndex, cat] of DESIGN_STUDIO_CATALOG.entries()) {
      const category = await DesignCategory.create({
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        image: cat.image,
        displayOrder: catIndex,
        isActive: true,
      });
      categoriesCreated += 1;

      for (const [subIndex, sub] of cat.subcategories.entries()) {
        const subcategory = await DesignSubcategory.create({
          categoryId: category._id,
          name: sub.name,
          slug: sub.slug,
          description: `${sub.name} — ${cat.name} design inspiration at Sara Royal Boutique.`,
          image: DESIGN_STUDIO_IMAGES[designIndex % DESIGN_STUDIO_IMAGES.length],
          displayOrder: subIndex,
          isActive: true,
        });
        subcategoriesCreated += 1;

        if (subIndex < 2) {
          const thumb = DESIGN_STUDIO_IMAGES[designIndex % DESIGN_STUDIO_IMAGES.length];
          const title = `${sub.name} — ${cat.name}`;
          const slug = createSlug(`${cat.slug}-${sub.slug}-design`);
          const isBridal =
            cat.slug.includes("bridal") || sub.name.toLowerCase().includes("bridal");

          await Design.create({
            title,
            slug,
            categoryId: category._id,
            subcategoryId: subcategory._id,
            shortDescription: `Premium ${sub.name.toLowerCase()} by Sara Royal Boutique.`,
            fullDescription: `Expert boutique stitching for ${sub.name} in our ${cat.name} collection. Custom fitting, premium finishing, and personalized consultation in Kharar.`,
            thumbnailImage: thumb,
            galleryImages: [
              thumb,
              DESIGN_STUDIO_IMAGES[(designIndex + 1) % DESIGN_STUDIO_IMAGES.length],
            ],
            tags: [cat.name, sub.name, "Sara Royal", "Kharar"],
            stitchingPrice: isBridal ? "₹8,500+" : "₹2,500+",
            fabricRecommendation: isBridal ? "Silk, Velvet, Net" : "Cotton, Georgette, Crepe",
            deliveryTimeline: isBridal ? "12–18 days" : "7–10 days",
            featured: catIndex < 3 && subIndex === 0,
            trending: catIndex < 5 && subIndex === 0,
            newArrival: designIndex < 10,
            bridalSpecial: isBridal,
            homepageShow: catIndex < 4 && subIndex === 0,
            activeStatus: true,
            displayOrder: designIndex,
            seoTitle: `${sub.name} ${cat.name} | Sara Royal Boutique`,
            seoDescription: `${sub.name} ${cat.name.toLowerCase()} stitching at Sara Royal Boutique, Kharar.`,
            seoKeywords: `${sub.name}, ${cat.name}, boutique, Kharar`,
          });
          designsCreated += 1;
          designIndex += 1;
        }
      }
    }

    return jsonOk({
      message: "Design Studio seeded successfully",
      categories: categoriesCreated,
      subcategories: subcategoriesCreated,
      designs: designsCreated,
    });
  } catch (error) {
    console.error("[API /design-studio/seed POST]", error);
    return jsonError(error instanceof Error ? error.message : "Failed to seed Design Studio");
  }
}
