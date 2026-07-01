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
  const { items, isLoading } = useGallery(filter === "All" ? undefined : filter);

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
            <p className="gallery_empty text-center">No gallery images yet. Check back soon.</p>
          ) : (
            <div className="gallery_shop_grid">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="gallery_shop_card"
                  onClick={() =>
                    setLightboxItem({ image: item.image, title: item.title || item.category })
                  }
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

      <GalleryLightboxModal
        show={!!lightboxItem}
        image={lightboxItem?.image ?? ""}
        title={lightboxItem?.title ?? "Gallery"}
        onClose={() => setLightboxItem(null)}
      />

    </div>
  );
};

export default GalleryPage;
