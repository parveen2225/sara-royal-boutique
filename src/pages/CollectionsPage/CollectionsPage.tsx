"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Col, Container, Row } from "react-bootstrap";
import ProductCard from "@/components/boutique/ProductCard/ProductCard";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { getWhatsAppUrl } from "@/utils/whatsapp";
import { BoutiqueArrowRightIcon, BoutiqueWhatsAppIcon } from "@/assets/icons/svgIcon";
import { usePublicProducts } from "@/hooks/usePublicProducts";
import { usePublicServices } from "@/hooks/usePublicServices";
import { apiJson } from "@/lib/api/client";
import { COLLECTIONS } from "@/lib/api/urls";
import "./CollectionsPage.scss";

type ApiCollection = { id: string; name: string; serviceId: string };

const CollectionsPage: React.FC = () => {
  const products = usePublicProducts();
  const publicServices = usePublicServices();
  const [collections, setCollections] = useState<ApiCollection[]>([]);

  const services = useMemo(
    () => [
      { id: "__all__", title: "All" },
      ...publicServices.map((s) => ({
        id: s.id,
        title: s.title,
      })),
    ],
    [publicServices],
  );

  const [activeServiceId, setActiveServiceId] = useState<string>("__all__");
  const categories = useMemo(() => ["All", ...collections.map((c) => c.name)], [collections]);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    let cancelled = false;
    const url =
      activeServiceId === "__all__"
        ? COLLECTIONS.LIST
        : COLLECTIONS.LIST_BY_SERVICE(activeServiceId);
    apiJson<ApiCollection[]>(url)
      .then((res) => {
        if (cancelled) return;
        setCollections(res.data);
        setActiveCategory("All");
      })
      .catch(() => { });
    return () => {
      cancelled = true;
    };
  }, [activeServiceId]);

  const allowedCategoryNames = useMemo(
    () => new Set(collections.map((c) => c.name)),
    [collections],
  );

  const filtered = useMemo(() => {
    const scoped = products.filter((p) => allowedCategoryNames.has(p.category));
    if (activeCategory === "All") return scoped;
    return scoped.filter((p) => p.category === activeCategory);
  }, [activeCategory, allowedCategoryNames, products]);

  const activeService = activeServiceId !== "__all__"
    ? services.find((s) => s.id === activeServiceId)
    : null;

  const clearServiceFilter = () => {
    setActiveServiceId("__all__");
  };

  const handleCategoryChange = (value: string) => {
    setActiveCategory(value);
  };

  return (
    <div className="boutique_page collections_page">

      <section className="collections_hero">
        <div className="collections_hero_overlay" />
        <div className="collections_hero_content">
          <span className="collections_hero_label">Our Services</span>
          <h1 className="collections_hero_title">Service Collections</h1>
          <p className="collections_hero_sub">
            Browse designs by stitching service and choose your perfect fit.
          </p>
        </div>
      </section>

      <section className="collections_body">
        <Container>

          <div className="collections_section_header">
            <span className="collections_section_eyebrow">✦ Handpicked Designs</span>
            <h2 className="collections_section_title">
              Browse Our&nbsp;<em>Collections</em>
            </h2>
            <p className="collections_section_sub">
              Select a service below to explore all designs in that category.
            </p>
          </div>

          <div className="collections_toolbar">
            <div className="collections_toolbar_top">
              <p className="collections_count">
                Showing <strong>{filtered.length}</strong>{" "}
                {filtered.length === 1 ? "design" : "designs"}
                {activeCategory !== "All" && ` in "${activeCategory}"`}
              </p>

              <div className="collections_select_wrap" aria-label="Filter by collection">
                <select
                  className="collections_select"
                  value={activeCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {activeCategory !== "All" && (
              <div className="collections_active_filter_row" aria-label="Active filter">
                <div className="collections_active_filter_chip">
                  <span className="active_filter_label">{activeCategory}</span>
                  <button
                    type="button"
                    className="active_filter_clear_btn"
                    onClick={() => handleCategoryChange("All")}
                    aria-label={`Clear filter: ${activeCategory}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {activeService && (
              <div className="collections_active_filter_row" aria-label="Active service filter">
                <div className="collections_active_filter_chip collections_active_filter_chip--service">
                  <span className="active_filter_badge">Service</span>
                  <span className="active_filter_label">{activeService.title}</span>
                  <button
                    type="button"
                    className="active_filter_clear_btn"
                    onClick={clearServiceFilter}
                    aria-label={`Clear service filter: ${activeService.title}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="collections_divider" />

          {filtered.length === 0 ? (
            <div className="collections_empty">
              <span className="empty_icon">✦</span>
              <p>No designs found in this category.</p>
            </div>
          ) : (
            <Row className="g-3 g-xl-4">
              {filtered.map((product) => (
                <Col key={product.id} xs={6} lg={4} xl={3}>
                  <ProductCard product={product} />
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </section>

      <section className="collections_services_band">
        <Container>
          <div className="collections_services_inner">
            <div>
              <span className="collections_services_label">Stitching Services</span>
              <h2>Like a design? Get it stitched in your perfect fit.</h2>
              <p>
                Choose suit stitching, kurti stitching, designer suits, blouse
                stitching, pant/plazo, alterations, or custom designs directly
                from our services.
              </p>
            </div>
            <div className="collections_services_actions">
              <CommonButton role="link" to="/services" className="collections_services_outline">
                View Services
                <BoutiqueArrowRightIcon width={16} height={16} />
              </CommonButton>
              <CommonButton
                role="link"
                to={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="collections_services_gold"
                svgIcon={<BoutiqueWhatsAppIcon width={18} height={18} />}
              >
                Order on WhatsApp
              </CommonButton>
            </div>
          </div>
        </Container>
      </section>

    </div>
  );
};

export default CollectionsPage;
