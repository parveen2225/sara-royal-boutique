"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Container, Row, Col } from "react-bootstrap";
import { motion } from "framer-motion";
import Header from "@/components/boutique/Header/Header";
import BoutiqueFooter from "@/components/boutique/Footer/BoutiqueFooter";
import DesignBreadcrumb from "@/components/boutique/DesignStudio/DesignBreadcrumb";
import DesignCard from "@/components/boutique/DesignStudio/DesignCard";
import DesignStudioLightboxModal from "@/components/common/Modal/DesignStudioLightboxModal/DesignStudioLightboxModal";
import { useDesignCategories, useDesigns } from "@/hooks/useDesignStudio";
import type { StudioDesign } from "@/lib/admin/types";
import "./DesignStudio.scss";

const DesignStudioPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "featured" | "trending" | "bridal">("all");
  const [lightboxDesign, setLightboxDesign] = useState<StudioDesign | null>(null);

  const { categories, isLoading: categoriesLoading } = useDesignCategories();
  const { designs: trendingDesigns } = useDesigns({ trending: true, limit: 8 });
  const { designs: recentDesigns } = useDesigns({ newArrival: true, limit: 8 });
  const { designs: searchResults, isLoading: searchLoading } = useDesigns({
    search: search.trim() || undefined,
    featured: activeFilter === "featured" ? true : undefined,
    trending: activeFilter === "trending" ? true : undefined,
    bridal: activeFilter === "bridal" ? true : undefined,
    limit: search.trim() || activeFilter !== "all" ? 24 : undefined,
  });

  const showSearchSection = search.trim().length > 0 || activeFilter !== "all";

  const relatedForLightbox = useMemo(() => {
    if (!lightboxDesign) return [];
    return searchResults
      .concat(trendingDesigns)
      .filter((d) => d.id !== lightboxDesign.id && d.categorySlug === lightboxDesign.categorySlug)
      .filter((d, i, arr) => arr.findIndex((x) => x.id === d.id) === i)
      .slice(0, 4);
  }, [lightboxDesign, searchResults, trendingDesigns]);

  return (
    <div className="boutique_page design_studio_page">
      <Header />

      <section className="ds_hero">
        <div className="ds_hero_bg" aria-hidden="true" />
        <Container className="ds_hero_inner">
          <DesignBreadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Design Studio" },
            ]}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="section_label">Inspiration Gallery</span>
            <h1 className="ds_hero_title">
              Design <em>Studio</em>
            </h1>
            <p className="ds_hero_desc">
              Explore premium neck, sleeve, bridal, anarkali, and party wear designs.
              Find your perfect look and get it stitched at Sara Royal Boutique.
            </p>
          </motion.div>

          <div className="ds_search_wrap">
            <input
              type="search"
              className="ds_search_input"
              placeholder="Search designs, categories, styles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search designs"
            />
            <div className="ds_filters" role="tablist" aria-label="Design filters">
              {(["all", "featured", "trending", "bridal"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === f}
                  className={`ds_filter_btn ${activeFilter === f ? "is_active" : ""}`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {showSearchSection && (
        <section className="ds_section ds_search_results">
          <Container>
            <h2 className="ds_section_title">
              {search.trim() ? `Results for "${search}"` : `${activeFilter} Designs`}
            </h2>
            {searchLoading ? (
              <div className="ds_skeleton_grid" aria-hidden="true">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="ds_skeleton_card" />
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              <p className="ds_empty">No designs found. Try another search or browse categories below.</p>
            ) : (
              <div className="ds_grid">
                {searchResults.map((design, i) => (
                  <DesignCard
                    key={design.id}
                    design={design}
                    index={i}
                    onOpen={setLightboxDesign}
                  />
                ))}
              </div>
            )}
          </Container>
        </section>
      )}

      {!showSearchSection && trendingDesigns.length > 0 && (
        <section className="ds_section ds_trending">
          <Container>
            <div className="ds_section_head">
              <span className="section_label">Hot Picks</span>
              <h2 className="ds_section_title">Trending Designs</h2>
            </div>
            <div className="ds_grid ds_grid_compact">
              {trendingDesigns.map((design, i) => (
                <DesignCard key={design.id} design={design} index={i} onOpen={setLightboxDesign} />
              ))}
            </div>
          </Container>
        </section>
      )}

      <section className="ds_section ds_categories">
        <Container>
          <div className="ds_section_head">
            <span className="section_label">Browse By Style</span>
            <h2 className="ds_section_title">Design Categories</h2>
            <p className="ds_section_sub">
              From neck patterns to bridal couture — explore every detail of boutique craftsmanship.
            </p>
          </div>

          {categoriesLoading ? (
            <div className="ds_skeleton_grid ds_skeleton_categories" aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="ds_skeleton_card" />
              ))}
            </div>
          ) : (
            <Row className="g-4">
              {categories.map((cat, i) => (
                <Col key={cat.id} xs={12} sm={6} lg={3} xl={3}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: i * 0.04 }}
                  >
                    <Link href={`/design-studio/${cat.slug}`} className="ds_category_card">
                      <div className="ds_category_card_media">
                        <Image
                          src={cat.image || "/images/punjabi_1.jpg"}
                          alt={cat.name}
                          fill
                          className="ds_category_card_image"
                          sizes="(max-width: 576px) 100vw, 33vw"
                          unoptimized={(cat.image || "").startsWith("http")}
                        />
                        <span className="ds_category_card_overlay">
                          <span className="ds_category_card_name">{cat.name}</span>
                          <span className="ds_category_card_count">
                            {cat.subcategoryCount ?? 0} styles
                          </span>
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </section>

      {!showSearchSection && recentDesigns.length > 0 && (
        <section className="ds_section ds_recent">
          <Container>
            <div className="ds_section_head">
              <span className="section_label">Fresh Arrivals</span>
              <h2 className="ds_section_title">Recently Added</h2>
            </div>
            <div className="ds_grid ds_grid_compact">
              {recentDesigns.map((design, i) => (
                <DesignCard key={design.id} design={design} index={i} onOpen={setLightboxDesign} />
              ))}
            </div>
          </Container>
        </section>
      )}

      <DesignStudioLightboxModal
        design={lightboxDesign}
        related={relatedForLightbox}
        onClose={() => setLightboxDesign(null)}
        onOpenRelated={setLightboxDesign}
      />

      <BoutiqueFooter />
    </div>
  );
};

export default DesignStudioPage;
