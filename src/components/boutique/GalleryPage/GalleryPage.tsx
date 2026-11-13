"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { Container } from "react-bootstrap";
import GalleryLightboxModal from "@/components/common/Modal/GalleryLightboxModal/GalleryLightboxModal";
import { useGallery } from "@/hooks/useGallery";
import { GALLERY_CATEGORIES, type GalleryCategory } from "@/lib/admin/types";
import "./GalleryPage.scss";

type FilterValue = "All" | GalleryCategory;

const GalleryPage: React.FC = () => {
  const [filter, setFilter] = useState<FilterValue>("All");
  const [lightboxItem, setLightboxItem] = useState<{ image: string; title: string } | null>(
    null,
  );
  const { items, isLoading, hasError } = useGallery(filter === "All" ? undefined : filter);

  const filters = useMemo(() => ["All" as const, ...GALLERY_CATEGORIES], []);

  return (
    <div className="boutique_page gallery_page">

      <section className="gallery_page_hero">
        <div className="gallery_page_hero_bg" />
        <Container className="gallery_page_hero_inner">
          <span className="section_label">Portfolio</span>
          <h1>Our Work Gallery</h1>
          <p>
            Explore bridal, anarkali, party wear, kurti, and plazo creations crafted with
            boutique precision at Sara Royal.
          </p>
        </Container>
      </section>

      <section className="gallery_page_content py-section">
        <Container>
          <div className="gallery_filters" role="tablist" aria-label="Gallery categories">
            {filters.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={filter === cat}
                className={`gallery_filter_btn ${filter === cat ? "is_active" : ""}`}
                onClick={() => setFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="gallery_skeleton_grid" aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="gallery_skeleton_item" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="gallery_empty text-center" role="status">
              <p>{hasError ? "We couldn’t load the gallery right now." : "No gallery images in this category yet."}</p>
              <a href="https://wa.me/919779379004" target="_blank" rel="noopener noreferrer">Ask us to share our latest work</a>
            </div>
          ) : (
            <div className="gallery_shop_grid">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="gallery_shop_card"
                  onClick={() => {
                    const image = item.image?.trim();
                    if (image) setLightboxItem({ image, title: item.title || item.category });
                  }}
                  aria-label={`View ${item.title || item.category}`}
                >
                  <div className="gallery_shop_image_wrap">
                    <Image
                      src={item.image}
                      alt={item.title || item.category}
                      fill
                      className="gallery_shop_image"
                      sizes="(max-width: 576px) 100vw, (max-width: 991px) 50vw, 25vw"
                      loading="lazy"
                      unoptimized={item.image.startsWith("http")}
                    />
                    <span className="gallery_masonry_overlay">
                      <span className="gallery_masonry_category">{item.category}</span>
                      {item.title && (
                        <span className="gallery_masonry_title">{item.title}</span>
                      )}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Container>
      </section>

      {lightboxItem?.image && <GalleryLightboxModal
        show={!!lightboxItem}
        image={lightboxItem.image}
        title={lightboxItem.title}
        onClose={() => setLightboxItem(null)}
      />}

    </div>
  );
};

export default GalleryPage;
