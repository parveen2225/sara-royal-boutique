import { notFound } from "next/navigation";
import SeoLandingPage from "@/components/boutique/SeoLandingPage/SeoLandingPage";
import { getSeoPageConfig } from "@/data/seoPages";

const SLUG = "suit-stitching-kharar";
const config = getSeoPageConfig(SLUG);

export const metadata = {
  title: config?.metaTitle ?? "Suit Stitching in Kharar — Sara Royal Boutique",
  description: config?.metaDescription ?? "",
};

export default function SuitStitchingKhararPage() {
  if (!config) notFound();
  return <SeoLandingPage config={config} />;
}
