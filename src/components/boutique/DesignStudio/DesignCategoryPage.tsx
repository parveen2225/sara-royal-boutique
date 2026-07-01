"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Container, Row, Col } from "react-bootstrap";
import { motion } from "framer-motion";
import DesignBreadcrumb from "@/components/boutique/DesignStudio/DesignBreadcrumb";
import DesignCard from "@/components/boutique/DesignStudio/DesignCard";
import DesignStudioLightboxModal from "@/components/common/Modal/DesignStudioLightboxModal/DesignStudioLightboxModal";
import { useDesignSubcategories, useDesigns } from "@/hooks/useDesignStudio";
import type { DesignCategory, StudioDesign } from "@/lib/admin/types";
import "./DesignStudio.scss";

type Props = {
  category: DesignCategory;
};

const DesignCategoryPage: React.FC<Props> = ({ category }) => {
  const [lightboxDesign, setLightboxDesign] = useState<StudioDesign | null>(null);
  const { subcategories, isLoading } = useDesignSubcategories(category.slug);
  const { designs: categoryDesigns } = useDesigns({
    categorySlug: category.slug,
    featured: true,
    limit: 6,
  });

  return (
    <div className="boutique_page design_studio_page">

      <section className="ds_hero ds_hero_compact">
        <div className="ds_hero_bg" aria-hidden="true" />
        <Container className="ds_hero_inner">
          <DesignBreadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Design Studio", href: "/design-studio" },
              { label: category.name },
            ]}
          />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="ds_category_hero_row"
          >
            <div>
              <span className="section_label">Category</span>
              <h1 className="ds_hero_title">{category.name}</h1>
              <p className="ds_hero_desc">{category.description}</p>
            </div>
            {category.image && (
              <div className="ds_category_hero_thumb">
                <Image
                  src={category.image}
                  alt={category.name}
                  width={200}
                  height={240}
                  className="ds_category_hero_image"
                  unoptimized={category.image.startsWith("http")}
                />
              </div>
            )}
          </motion.div>
        </Container>
      </section>

      {categoryDesigns.length > 0 && (
        <section className="ds_section">
          <Container>
            <h2 className="ds_section_title">Featured in {category.name}</h2>
            <div className="ds_grid ds_grid_compact">
              {categoryDesigns.map((design, i) => (
                <DesignCard key={design.id} design={design} index={i} onOpen={setLightboxDesign} />
              ))}
            </div>
          </Container>
        </section>
      )}

      <section className="ds_section ds_subcategories">
        <Container>
          <div className="ds_section_head">
            <span className="section_label">Subcategories</span>
            <h2 className="ds_section_title">Choose Your Style</h2>
          </div>

          {isLoading ? (
            <div className="ds_skeleton_grid" aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="ds_skeleton_card" />
              ))}
            </div>
          ) : subcategories.length === 0 ? (
            <p className="ds_empty">No subcategories available yet.</p>
          ) : (
            <Row className="g-3">
              {subcategories.map((sub, i) => (
                <Col key={sub.id} xs={6} sm={4} md={4} lg={3} xl={2}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.03 }}
                  >
                    <Link
                      href={`/design-studio/${category.slug}/${sub.slug}`}
                      className="ds_subcategory_card"
                    >
                      <div className="ds_subcategory_card_media">
                        <Image
                          src={sub.image || category.image || "/images/punjabi_1.jpg"}
                          alt={sub.name}
                          fill
                          className="ds_subcategory_card_image"
                          sizes="(max-width: 576px) 100vw, 25vw"
                          unoptimized={(sub.image || "").startsWith("http")}
                        />
                      </div>
                      <span className="ds_subcategory_card_name">{sub.name}</span>
                      {(sub.designCount ?? 0) > 0 && (
                        <span className="ds_subcategory_card_count">{sub.designCount} designs</span>
                      )}
                    </Link>
                  </motion.div>
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </section>

      <DesignStudioLightboxModal
        design={lightboxDesign}
        related={categoryDesigns.filter((d) => d.id !== lightboxDesign?.id)}
        onClose={() => setLightboxDesign(null)}
        onOpenRelated={setLightboxDesign}
      />

    </div>
  );
};

export default DesignCategoryPage;
