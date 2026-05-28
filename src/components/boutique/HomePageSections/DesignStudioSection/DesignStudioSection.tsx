"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Container } from "react-bootstrap";
import { motion } from "framer-motion";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { useDesigns } from "@/hooks/useDesignStudio";
import "@/components/boutique/DesignStudio/DesignStudio.scss";

const DesignStudioHomeSection: React.FC = () => {
  const { designs, isLoading } = useDesigns({ homepageShow: true, limit: 6 });

  if (!isLoading && designs.length === 0) return null;

  return (
    <section className="design_studio_home_section" id="design-studio">
      <Container>
        <div className="ds_home_head">
          <span className="section_label">Design Inspiration</span>
          <h2 className="section_title">
            Explore Our <em>Design Studio</em>
          </h2>
          <p className="section_sub mx-auto">
            Browse neck, sleeve, bridal, and party wear designs — then get your favourite
            stitched at Sara Royal Boutique.
          </p>
        </div>

        {isLoading ? (
          <div className="ds_home_grid" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="ds_skeleton_card" style={{ aspectRatio: "3/4" }} />
            ))}
          </div>
        ) : (
          <div className="ds_home_grid">
            {designs.map((design, i) => (
              <motion.div
                key={design.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Link
                  href={`/design-studio/${design.categorySlug}/${design.subcategorySlug}`}
                  className="ds_home_card"
                >
                  <Image
                    src={design.thumbnailImage}
                    alt={design.title}
                    fill
                    sizes="(max-width: 576px) 50vw, 16vw"
                    unoptimized={design.thumbnailImage.startsWith("http")}
                  />
                  <span className="ds_home_card_overlay">
                    <span>{design.title}</span>
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        <div className="ds_home_cta">
          <CommonButton role="link" to="/design-studio" className="boutique_gold_btn">
            Explore Design Studio →
          </CommonButton>
        </div>
      </Container>
    </section>
  );
};

export default DesignStudioHomeSection;
