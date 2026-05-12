import { notFound } from "next/navigation";
import { getProductById, PRODUCTS } from "@/data/products";
import ProductDetailPage from "@/pages/ProductDetailPage/ProductDetailPage";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return PRODUCTS.map((product) => ({ id: product.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) {
    return {
      title: "Product Details — Sara Royal Boutique",
      description:
        "View Sara Royal Boutique product details, stitching price, service category, and WhatsApp ordering options.",
    };
  }
  return {
    title: `${product.name} — Sara Royal Boutique`,
    description: product.description.slice(0, 160),
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  if (!id) notFound();
  return <ProductDetailPage productId={id} />;
}
