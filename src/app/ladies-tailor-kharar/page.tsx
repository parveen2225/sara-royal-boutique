import { notFound } from "next/navigation";
import SeoLandingPage from "@/components/boutique/SeoLandingPage/SeoLandingPage";
import { getSeoPageConfig } from "@/data/seoPages";

const SLUG = "ladies-tailor-kharar";
const config = getSeoPageConfig(SLUG);

export const metadata = {
  title: config?.metaTitle ?? "Ladies Tailor in Kharar — Sara Royal Boutique",
  description: config?.metaDescription ?? "",
};

export default function LadiesTailorKhararPage() {
  if (!config) notFound();
  return <SeoLandingPage config={config} />;
}
