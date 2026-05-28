import { notFound } from "next/navigation";
import DesignCategoryPage from "@/components/boutique/DesignStudio/DesignCategoryPage";
import { DESIGN_STUDIO_CATALOG } from "@/data/designStudioCatalog";
import { getFallbackCategoryBySlug } from "@/data/designStudioFallback";
import type { DesignCategory } from "@/lib/admin/types";

type PageProps = {
  params: Promise<{ category: string }>;
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

export async function generateStaticParams() {
  return DESIGN_STUDIO_CATALOG.map((cat) => ({ category: cat.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { category: slug } = await params;
  const category = resolveCategory(slug);
  if (!category) return { title: "Design Studio | Sara Royal Boutique" };

  return {
    title: `${category.name} Designs | Sara Royal Boutique Design Studio`,
    description: category.description,
    keywords: `${category.name}, design studio, boutique stitching, Kharar, Sara Royal`,
    openGraph: {
      title: `${category.name} | Sara Royal Design Studio`,
      description: category.description,
      type: "website",
    },
  };
}

export default async function DesignCategoryRoute({ params }: PageProps) {
  const { category: slug } = await params;
  const category = resolveCategory(slug);
  if (!category) notFound();

  return <DesignCategoryPage category={category} />;
}
