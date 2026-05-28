import DesignStudioPage from "@/components/boutique/DesignStudio/DesignStudioPage";

export const metadata = {
  title: "Design Studio — Premium Fashion Inspiration | Sara Royal Boutique",
  description:
    "Explore neck, sleeve, bridal, anarkali, kurti, and party wear designs at Sara Royal Boutique. Get your favourite design stitched with expert fitting in Kharar.",
  keywords:
    "design studio, neck designs, sleeve designs, bridal designs, anarkali designs, boutique stitching Kharar, Sara Royal",
  openGraph: {
    title: "Design Studio | Sara Royal Boutique",
    description:
      "Premium fashion design inspiration — browse categories and get designs stitched at Sara Royal Boutique.",
    type: "website",
  },
};

export default function DesignStudioRoute() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Design Studio — Sara Royal Boutique",
            description: metadata.description,
            url: "https://sararoyalboutique.com/design-studio",
          }),
        }}
      />
      <DesignStudioPage />
    </>
  );
}
