"use client";

import React from "react";
import Link from "next/link";
import { Col, Container, Row } from "react-bootstrap";
import BoutiqueNavbar from "@/components/boutique/Header/Header";
import BoutiqueFooter from "@/components/boutique/Footer/BoutiqueFooter";
import ProductCard from "@/components/boutique/ProductCard/ProductCard";
import ProductGallery from "@/components/boutique/ProductGallery/ProductGallery";
import { type Product } from "@/data/products";
import { buildProductPageWhatsAppUrl, buildProductSuggestionWhatsAppUrl } from "@/utils/whatsapp";
import { BoutiqueWhatsAppIcon, BoutiqueInstagramIcon } from "@/assets/icons/svgIcon";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { usePublicProducts } from "@/hooks/usePublicProducts";
import { useSyncExternalStore } from "react";
import { loadingStore } from "@/lib/loading/loadingStore";
import "./ProductDetailPage.scss";

interface ProductDetailPageProps {
  productId: string;
}

const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ productId }) => {
  const products = usePublicProducts();
  const product: Product | undefined = products.find((item) => item.id === productId);
  const isLoading = useSyncExternalStore(
    loadingStore.subscribe,
    loadingStore.getSnapshot,
    () => false,
  );

  if (!product) {
    if (isLoading) {
      return (
        <div className="boutique_page">
          <BoutiqueNavbar />
          <div style={{ minHeight: "60vh" }} />
          <BoutiqueFooter />
        </div>
      );
    }
    return (
      <div className="boutique_page">
        <BoutiqueNavbar />
        <div className="product_not_found">
          <span className="not_found_icon">✦</span>
          <h2>Design Not Found</h2>
          <p>This collection piece is no longer available.</p>
          <CommonButton role="link" to="/collections" className="boutique_gold_btn_inline">
            Browse Collections
          </CommonButton>
        </div>
        <BoutiqueFooter />
      </div>
    );
  }

  const related = products
    .filter((item) => item.id !== product.id && item.category === product.category)
    .slice(0, 3);

  const handleWhatsAppOrder = () => {
    const url = buildProductPageWhatsAppUrl(
      product.id,
      {
        name: product.name,
        price: product.price,
        category: product.category,
        description: product.description,
      },
      window.location.origin,
    );
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleWhatsAppSuggestion = () => {
    const url = buildProductSuggestionWhatsAppUrl(
      product.id,
      {
        name: product.name,
        category: product.category,
      },
      window.location.origin,
    );
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="boutique_page product_detail_page">
      <BoutiqueNavbar />

      <section className="product_detail_section">
        <Container>

          <nav className="product_breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="breadcrumb_sep">✦</span>
            <Link href="/collections">Collections</Link>
            <span className="breadcrumb_sep">✦</span>
            <span aria-current="page">{product.name}</span>
          </nav>

          <Row className="g-5 g-lg-6">

            <Col xs={12} md={6}>
              <div className="product_detail_image_wrap">
                <ProductGallery
                  images={
                    product.imageUrls && product.imageUrls.length > 0
                      ? product.imageUrls
                      : product.image
                        ? [product.image]
                        : []
                  }
                  name={product.name}
                />
                {product.category && (
                  <div className="product_detail_img_badge">{product.category}</div>
                )}
              </div>
            </Col>


            <Col xs={12} md={6}>
              <div className="product_detail_info">
                <span className="product_detail_cat">{product.category}</span>
                <h1 className="product_detail_title">{product.name}</h1>

                {product.price && (
                  <div className="product_detail_price_block">
                    <span className="product_detail_price_label">Stitching Price (INR)</span>
                    <p className="product_detail_price">{product.price}</p>
                  </div>
                )}

                <div className="product_detail_divider" aria-hidden="true" />

                <p className="product_detail_desc">{product.description}</p>

                {product.tags && product.tags.length > 0 && (
                  <div className="product_detail_tags">
                    {product.tags.map((tag) => (
                      <span key={tag} className="product_tag">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="product_detail_cta_group">
                  <CommonButton
                    type="button"
                    onClick={handleWhatsAppOrder}
                    className="product_detail_order_btn"
                    svgIcon={<BoutiqueWhatsAppIcon width={20} height={20} />}
                  >
                    Order via WhatsApp
                  </CommonButton>
                  <CommonButton
                    type="button"
                    onClick={handleWhatsAppSuggestion}
                    className="product_detail_suggest_btn"
                    svgIcon={<BoutiqueWhatsAppIcon width={20} height={20} />}
                  >
                    Get Design Suggestions
                  </CommonButton>
                  <CommonButton role="link" to="/collections" className="product_detail_back_btn">
                    ← Back to Collections
                  </CommonButton>
                </div>

                <div className="product_social_links mb-3">
                  <a
                    href="https://www.instagram.com/sararoyalboutique"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="product_social_pill instagram"
                    aria-label="Instagram"
                  >
                    <BoutiqueInstagramIcon width={16} height={16} />
                    <span>Instagram</span>
                  </a>
                  <a
                    href="https://g.page/r/CW8_ymiprhnvEBM/review"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="product_social_pill google"
                    aria-label="Leave a Google Review"
                  >
                    <span className="product_social_star">⭐</span>
                    <span>Leave a Review</span>
                  </a>
                </div>


                <div className="product_detail_badges">
                  <div className="trust_badge">
                    <span className="trust_icon">✦</span>
                    <span>Custom Stitching</span>
                  </div>
                  <div className="trust_badge">
                    <span className="trust_icon">✦</span>
                    <span>Perfect Fit Guarantee</span>
                  </div>
                  <div className="trust_badge">
                    <span className="trust_icon">✦</span>
                    <span>Premium Quality</span>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>


      {related.length > 0 && (
        <section className="related_products_section">
          <Container>
            <div className="section_header_left">
              <span className="product_detail_section_label">You May Also Like</span>
              <h3 className="related_title">Similar Designs</h3>
            </div>
            <Row className="g-3 g-xl-4">
              {related.map((rp) => (
                <Col key={rp.id} xs={12} sm={6} lg={4}>
                  <ProductCard product={rp} />
                </Col>
              ))}
            </Row>
          </Container>
        </section>
      )}

      <BoutiqueFooter />
    </div>
  );
};

export default ProductDetailPage;
