import { createSlug } from "@/lib/api/utils";
import {
  DESIGN_STUDIO_CATALOG,
  DESIGN_STUDIO_IMAGES,
} from "@/data/designStudioCatalog";
import type {
  DesignCategory,
  DesignSubcategory,
  StudioDesign,
} from "@/lib/admin/types";

let cachedFallback: {
  categories: DesignCategory[];
  subcategories: DesignSubcategory[];
  designs: StudioDesign[];
} | null = null;

const makeId = (prefix: string, slug: string) => `${prefix}_${slug}`;

export const buildDesignStudioFallback = () => {
  if (cachedFallback) return cachedFallback;

  const categories: DesignCategory[] = [];
  const subcategories: DesignSubcategory[] = [];
  const designs: StudioDesign[] = [];

  let designIndex = 0;

  DESIGN_STUDIO_CATALOG.forEach((cat, catIndex) => {
    const categoryId = makeId("cat", cat.slug);
    categories.push({
      id: categoryId,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      displayOrder: catIndex,
      isActive: true,
      subcategoryCount: cat.subcategories.length,
      designCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    cat.subcategories.forEach((sub, subIndex) => {
      const subcategoryId = makeId("sub", `${cat.slug}-${sub.slug}`);
      subcategories.push({
        id: subcategoryId,
        categoryId,
        categorySlug: cat.slug,
        categoryName: cat.name,
        name: sub.name,
        slug: sub.slug,
        description: `${sub.name} inspiration from Sara Royal Boutique ${cat.name} collection.`,
        image: DESIGN_STUDIO_IMAGES[designIndex % DESIGN_STUDIO_IMAGES.length],
        displayOrder: subIndex,
        isActive: true,
        designCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Seed 1–2 designs per subcategory for first 3 subcategories of each category
      if (subIndex < 2) {
        const thumb = DESIGN_STUDIO_IMAGES[designIndex % DESIGN_STUDIO_IMAGES.length];
        const gallery = [
          thumb,
          DESIGN_STUDIO_IMAGES[(designIndex + 1) % DESIGN_STUDIO_IMAGES.length],
        ];
        const title = `${sub.name} — ${cat.name}`;
        const slug = createSlug(`${cat.slug}-${sub.slug}-design-${subIndex + 1}`);
        const isFeatured = catIndex < 3 && subIndex === 0;
        const isTrending = catIndex < 4 && subIndex === 0;
        const isBridal = cat.slug.includes("bridal") || sub.name.toLowerCase().includes("bridal");
        const isNew = designIndex < 8;

        designs.push({
          id: makeId("design", slug),
          title,
          slug,
          categoryId,
          categorySlug: cat.slug,
          categoryName: cat.name,
          subcategoryId,
          subcategorySlug: sub.slug,
          subcategoryName: sub.name,
          shortDescription: `Premium ${sub.name.toLowerCase()} stitching reference by Sara Royal Boutique.`,
          fullDescription: `This ${sub.name} design showcases boutique-level finishing, precise fitting, and elegant detailing. Perfect for clients seeking ${cat.name.toLowerCase()} with Sara Royal's signature craftsmanship in Kharar.`,
          thumbnailImage: thumb,
          galleryImages: gallery,
          tags: [cat.name, sub.name, "Sara Royal", "Kharar"],
          stitchingPrice: isBridal ? "₹8,500+" : "₹2,500+",
          fabricRecommendation: isBridal ? "Silk, Velvet, or Net with lining" : "Cotton, Georgette, or Crepe",
          deliveryTimeline: isBridal ? "12–18 days" : "7–10 days",
          featured: isFeatured,
          trending: isTrending,
          newArrival: isNew,
          bridalSpecial: isBridal,
          homepageShow: isFeatured || isTrending,
          activeStatus: true,
          displayOrder: designIndex,
          seoTitle: `${sub.name} ${cat.name} | Sara Royal Boutique`,
          seoDescription: `Explore ${sub.name} ${cat.name.toLowerCase()} at Sara Royal Boutique, Kharar. Premium stitching with expert fitting.`,
          seoKeywords: `${sub.name}, ${cat.name}, boutique stitching, Kharar, Sara Royal`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        designIndex += 1;
      }
    });
  });

  categories.forEach((cat) => {
    cat.designCount = designs.filter((d) => d.categoryId === cat.id).length;
    cat.subcategoryCount = subcategories.filter((s) => s.categoryId === cat.id).length;
  });

  subcategories.forEach((sub) => {
    sub.designCount = designs.filter((d) => d.subcategoryId === sub.id).length;
  });

  cachedFallback = { categories, subcategories, designs };
  return cachedFallback;
};

export const getFallbackDesignCategories = () => buildDesignStudioFallback().categories;
export const getFallbackDesignSubcategories = (categorySlug?: string) => {
  const { subcategories } = buildDesignStudioFallback();
  if (!categorySlug) return subcategories;
  return subcategories.filter((s) => s.categorySlug === categorySlug);
};
export const getFallbackDesigns = (filters?: {
  categorySlug?: string;
  subcategorySlug?: string;
  search?: string;
  featured?: boolean;
  trending?: boolean;
  bridal?: boolean;
  newArrival?: boolean;
  homepageShow?: boolean;
  limit?: number;
}) => {
  let list = buildDesignStudioFallback().designs.filter((d) => d.activeStatus);

  if (filters?.categorySlug) {
    list = list.filter((d) => d.categorySlug === filters.categorySlug);
  }
  if (filters?.subcategorySlug) {
    list = list.filter((d) => d.subcategorySlug === filters.subcategorySlug);
  }
  if (filters?.featured) list = list.filter((d) => d.featured);
  if (filters?.trending) list = list.filter((d) => d.trending);
  if (filters?.bridal) list = list.filter((d) => d.bridalSpecial);
  if (filters?.newArrival) list = list.filter((d) => d.newArrival);
  if (filters?.homepageShow) list = list.filter((d) => d.homepageShow);
  if (filters?.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    list = list.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.categoryName.toLowerCase().includes(q) ||
        d.subcategoryName.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }

  list.sort((a, b) => a.displayOrder - b.displayOrder);
  if (filters?.limit) list = list.slice(0, filters.limit);
  return list;
};

export const getFallbackCategoryBySlug = (slug: string) =>
  getFallbackDesignCategories().find((c) => c.slug === slug) ?? null;

export const getFallbackSubcategoryBySlug = (categorySlug: string, subSlug: string) =>
  getFallbackDesignSubcategories(categorySlug).find((s) => s.slug === subSlug) ?? null;

export const getFallbackDesignBySlug = (slug: string) =>
  buildDesignStudioFallback().designs.find((d) => d.slug === slug && d.activeStatus) ?? null;
