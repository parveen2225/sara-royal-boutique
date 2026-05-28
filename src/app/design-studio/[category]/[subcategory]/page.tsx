import { notFound } from "next/navigation";
import DesignSubcategoryPage from "@/components/boutique/DesignStudio/DesignSubcategoryPage";
import { DESIGN_STUDIO_CATALOG } from "@/data/designStudioCatalog";
import {
  getFallbackCategoryBySlug,
  getFallbackSubcategoryBySlug,
} from "@/data/designStudioFallback";
import type { DesignCategory, DesignSubcategory } from "@/lib/admin/types";

type PageProps = {
  params: Promise<{ category: string; subcategory: string }>;
};

const resolveCategory = (slug: string): DesignCategory | null => {
  const fromFallback = getFallbackCategoryBySlug(slug);
  if (fromFallback) return fromFallback;

  const fromCatalog = DESIGN_STUDIO_CATALOG.find((c) => c.slug === slug);
  if (!fromCatalog) return null;

  return {
    id: `cat_${fromCatalog.slug}`,
    name: fromCatalog.name,
    slug: fromCatalog.slug,
    description: fromCatalog.description,
    image: fromCatalog.image,
    displayOrder: 0,
    isActive: true,
    subcategoryCount: fromCatalog.subcategories.length,
  };
};

const resolveSubcategory = (
  categorySlug: string,
  subSlug: string,
  category: DesignCategory,
): DesignSubcategory | null => {
  const fromFallback = getFallbackSubcategoryBySlug(categorySlug, subSlug);
  if (fromFallback) return fromFallback;

  const cat = DESIGN_STUDIO_CATALOG.find((c) => c.slug === categorySlug);
  const sub = cat?.subcategories.find((s) => s.slug === subSlug);
  if (!sub) return null;

  return {
    id: `sub_${categorySlug}-${sub.slug}`,
    categoryId: category.id,
    categorySlug: category.slug,
    categoryName: category.name,
    name: sub.name,
    slug: sub.slug,
    description: `${sub.name} — ${category.name} at Sara Royal Boutique.`,
    image: category.image,
    displayOrder: 0,
    isActive: true,
  };
};

export async function generateStaticParams() {
  return DESIGN_STUDIO_CATALOG.flatMap((cat) =>
    cat.subcategories.map((sub) => ({
      category: cat.slug,
      subcategory: sub.slug,
    })),
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { category: catSlug, subcategory: subSlug } = await params;
  const category = resolveCategory(catSlug);
  if (!category) return { title: "Design Studio | Sara Royal Boutique" };

  const subcategory = resolveSubcategory(catSlug, subSlug, category);
  if (!subcategory) return { title: `${category.name} | Sara Royal Boutique` };

  const title = `${subcategory.name} ${category.name} | Sara Royal Boutique`;
  const description =
    subcategory.description ||
    `Browse ${subcategory.name} designs in ${category.name}. Get expert stitching at Sara Royal Boutique, Kharar.`;

  return {
    title,
    description,
    keywords: `${subcategory.name}, ${category.name}, design studio, boutique Kharar`,
    openGraph: { title, description, type: "website" },
  };
}

export default async function DesignSubcategoryRoute({ params }: PageProps) {
  const { category: catSlug, subcategory: subSlug } = await params;
  const category = resolveCategory(catSlug);
  if (!category) notFound();

  const subcategory = resolveSubcategory(catSlug, subSlug, category);
  if (!subcategory) notFound();

  return <DesignSubcategoryPage category={category} subcategory={subcategory} />;
}
