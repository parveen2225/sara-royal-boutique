import { notFound } from "next/navigation";
import SeoLandingPage from "@/components/boutique/SeoLandingPage/SeoLandingPage";
import { getSeoPageConfig } from "@/data/seoPages";

const SLUG = "boutique-classes-punjab";
const config = getSeoPageConfig(SLUG);

export const metadata = {
  title: config?.metaTitle ?? "Boutique Classes in Punjab — Sara Royal Boutique",
  description: config?.metaDescription ?? "",
};

export default function BoutiqueClassesPunjabPage() {
  if (!config) notFound();
  return <SeoLandingPage config={config} />;
}
