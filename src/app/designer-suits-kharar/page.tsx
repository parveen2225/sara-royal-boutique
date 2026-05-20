import { notFound } from "next/navigation";
import SeoLandingPage from "@/components/boutique/SeoLandingPage/SeoLandingPage";
import { getSeoPageConfig } from "@/data/seoPages";

const SLUG = "designer-suits-kharar";
const config = getSeoPageConfig(SLUG);

export const metadata = {
  title: config?.metaTitle ?? "Designer Suits in Kharar — Sara Royal Boutique",
  description: config?.metaDescription ?? "",
};

export default function DesignerSuitsKhararPage() {
  if (!config) notFound();
  return <SeoLandingPage config={config} />;
}
