import type { Metadata } from "next";
import SuitDetailPage from "@/pages/SuitDetailPage/SuitDetailPage";
import { buildSuitMetadata, loadSuitForMetadata } from "@/lib/suitMetadata";

type PageProps = { params: Promise<{ id: string }> };

// Per-product title, description and Open Graph image so shared links (e.g. on WhatsApp) preview the real suit.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return buildSuitMetadata(await loadSuitForMetadata(id));
}

export default async function SuitPage({ params }: PageProps) {
  const { id } = await params;
  return <SuitDetailPage id={id} />;
}
