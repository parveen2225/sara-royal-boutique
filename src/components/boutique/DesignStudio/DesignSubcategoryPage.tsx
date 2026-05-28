"use client";

import React, { useMemo, useState } from "react";
import { Container } from "react-bootstrap";
import { motion } from "framer-motion";
import Header from "@/components/boutique/Header/Header";
import BoutiqueFooter from "@/components/boutique/Footer/BoutiqueFooter";
import DesignBreadcrumb from "@/components/boutique/DesignStudio/DesignBreadcrumb";
import DesignCard from "@/components/boutique/DesignStudio/DesignCard";
import DesignStudioLightboxModal from "@/components/common/Modal/DesignStudioLightboxModal/DesignStudioLightboxModal";
import { useDesigns } from "@/hooks/useDesignStudio";
import type { DesignCategory, DesignSubcategory, StudioDesign } from "@/lib/admin/types";
import "./DesignStudio.scss";

type Props = {
  category: DesignCategory;
  subcategory: DesignSubcategory;
};

const DesignSubcategoryPage: React.FC<Props> = ({ category, subcategory }) => {
  const [lightboxDesign, setLightboxDesign] = useState<StudioDesign | null>(null);
  const { designs, isLoading } = useDesigns({
    categorySlug: category.slug,
    subcategorySlug: subcategory.slug,
  });

  const relatedDesigns = useMemo(() => {
    if (!lightboxDesign) return [];
    return designs.filter((d) => d.id !== lightboxDesign.id).slice(0, 4);
  }, [lightboxDesign, designs]);

  return (
    <div className="boutique_page design_studio_page">
      <Header />

      <section className="ds_hero ds_hero_compact">
        <div className="ds_hero_bg" aria-hidden="true" />
        <Container className="ds_hero_inner">
          <DesignBreadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Design Studio", href: "/design-studio" },
              { label: category.name, href: `/design-studio/${category.slug}` },
              { label: subcategory.name },
            ]}
          />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="section_label">{category.name}</span>
            <h1 className="ds_hero_title">{subcategory.name}</h1>
            <p className="ds_hero_desc">
              {subcategory.description ||
                `Browse ${subcategory.name} designs and get them stitched at Sara Royal Boutique.`}
            </p>
          </motion.div>
        </Container>
      </section>

      <section className="ds_section">
        <Container>
          {isLoading ? (
            <div className="ds_skeleton_grid" aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="ds_skeleton_card" />
              ))}
            </div>
          ) : designs.length === 0 ? (
            <p className="ds_empty text-center">
              Designs coming soon for {subcategory.name}. Contact us on WhatsApp for custom stitching.
            </p>
          ) : (
            <div className="ds_grid ds_masonry">
              {designs.map((design, i) => (
                <DesignCard key={design.id} design={design} index={i} onOpen={setLightboxDesign} />
              ))}
            </div>
          )}
        </Container>
      </section>

      <DesignStudioLightboxModal
        design={lightboxDesign}
        related={relatedDesigns}
        onClose={() => setLightboxDesign(null)}
        onOpenRelated={setLightboxDesign}
      />

      <BoutiqueFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${subcategory.name} — ${category.name} | Sara Royal Boutique`,
            description: subcategory.description,
            url: `https://sararoyalboutique.com/design-studio/${category.slug}/${subcategory.slug}`,
            isPartOf: {
              "@type": "WebSite",
              name: "Sara Royal Boutique",
            },
          }),
        }}
      />
    </div>
  );
};

export default DesignSubcategoryPage;
