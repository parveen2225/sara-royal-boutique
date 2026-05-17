"use client";

import React from "react";
import { Col, Container, Row } from "react-bootstrap";
import ProductCard from "@/components/boutique/ProductCard/ProductCard";
import { BoutiqueArrowRightIcon } from "@/assets/icons/svgIcon";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { Product } from "@/data/products";
import "./CollectionsSection.scss";

type CollectionsSectionProps = {
  featuredProducts: Product[];
  isLoading: boolean;
};

const CollectionsSection: React.FC<CollectionsSectionProps> = ({
  featuredProducts,
  isLoading,
}) => {
  return (
    <section className="section_collections py-section" id="collections">
      <Container>
        <div className="section_header text-center">
          <span className="section_label">Our Collections</span>
          <h2 className="section_title">Elegant Designs for Every Occasion</h2>
          <p className="section_sub">
            Explore stitched suits, kurtis, designer wear, and graceful festive
            outfits finished with boutique-level detail.
          </p>
        </div>

        <Row className="g-3 g-xl-4">
          {featuredProducts.length > 0 ? (
            featuredProducts.map((product) => ( 
              <Col key={product.id} xs={6} sm={6} lg={4}>
                <ProductCard product={product} />
              </Col>
            ))
          ) : (
            <Col xs={12}>
              <div className="collections_empty text-center">
                <span className="empty_icon">✦</span>
                <p>{isLoading ? "Loading designs..." : "No designs available yet."}</p>
              </div>
            </Col>
          )}
        </Row>

        <div className="section_footer_cta">
          <CommonButton role="link" to="/collections" className="boutique_outline_btn">
            Browse Full Collection
            <BoutiqueArrowRightIcon width={16} height={16} />
          </CommonButton>
        </div>
      </Container>
    </section>
  );
};

export default CollectionsSection;
