"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { StudioDesign } from "@/lib/admin/types";
import { buildDesignStudioWhatsAppUrl } from "@/utils/whatsapp";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import CommonModal from "@/components/common/Modal/CommonModal";
import { BoutiqueWhatsAppIcon } from "@/assets/icons/svgIcon";
import "./DesignStudioLightboxModal.scss";

export type DesignStudioLightboxModalProps = {
  design: StudioDesign | null;
  related?: StudioDesign[];
  onClose: () => void;
  onOpenRelated?: (design: StudioDesign) => void;
};

const DesignStudioLightboxBadges: React.FC<{
  design: Pick<StudioDesign, "featured" | "trending" | "newArrival" | "bridalSpecial">;
}> = ({ design }) => {
  const badges = [
    design.trending && { key: "trending", label: "Trending" },
    design.featured && { key: "featured", label: "Featured" },
    design.newArrival && { key: "new", label: "New" },
    design.bridalSpecial && { key: "bridal", label: "Bridal" },
  ].filter(Boolean) as { key: string; label: string }[];

  if (badges.length === 0) return null;

  return (
    <div className="ds_lb_badges">
      {badges.map(({ key, label }) => (
        <span key={key} className={`ds_lb_badge ds_lb_badge_${key}`}>
          {label}
        </span>
      ))}
    </div>
  );
};

const DesignStudioLightboxModal: React.FC<DesignStudioLightboxModalProps> = ({
  design,
  related = [],
  onClose,
  onOpenRelated,
}) => {
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    setActiveImage(0);
  }, [design?.id]);

  if (!design) return null;

  const images = [design.thumbnailImage, ...design.galleryImages].filter(
    (img, i, arr) => img && arr.indexOf(img) === i,
  );
  const current = images[activeImage] || design.thumbnailImage;

  return (
    <CommonModal
      show={!!design}
      handleClose={onClose}
      heading={design.title}
      className="design_studio_lightbox_modal boutique-modal"
      variant="large"
    >
      <div className="ds_lb_layout">
        <div className="ds_lb_gallery">
          <motion.div
            key={current}
            className="ds_lb_main"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.32 }}
          >
            <Image
              src={current}
              alt={design.title}
              width={900}
              height={1100}
              className="ds_lb_image"
              unoptimized={current.startsWith("http")}
            />
          </motion.div>
          {images.length > 1 && (
            <div className="ds_lb_thumbs">
              {images.map((img, i) => (
                <button
                  key={`${img}-${i}`}
                  type="button"
                  className={`ds_lb_thumb ${i === activeImage ? "is_active" : ""}`}
                  onClick={() => setActiveImage(i)}
                  aria-label={`View image ${i + 1}`}
                >
                  <Image src={img} alt="" width={68} height={84} unoptimized={img.startsWith("http")} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ds_lb_details">
          <DesignStudioLightboxBadges design={design} />
          <p className="ds_lb_category">
            {design.categoryName} · {design.subcategoryName}
          </p>
          <p className="ds_lb_desc">{design.fullDescription || design.shortDescription}</p>

          <div className="ds_lb_meta">
            {design.stitchingPrice && (
              <div className="ds_lb_meta_item">
                <span className="ds_lb_meta_label">Stitching Price</span>
                <span className="ds_lb_meta_value">{design.stitchingPrice}</span>
              </div>
            )}
            {design.fabricRecommendation && (
              <div className="ds_lb_meta_item">
                <span className="ds_lb_meta_label">Fabric</span>
                <span className="ds_lb_meta_value">{design.fabricRecommendation}</span>
              </div>
            )}
            {design.deliveryTimeline && (
              <div className="ds_lb_meta_item">
                <span className="ds_lb_meta_label">Timeline</span>
                <span className="ds_lb_meta_value">{design.deliveryTimeline}</span>
              </div>
            )}
          </div>

          {design.tags.length > 0 && (
            <div className="ds_lb_tags">
              {design.tags.map((tag) => (
                <span key={tag} className="ds_lb_tag">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <CommonButton
            role="link"
            to={buildDesignStudioWhatsAppUrl(design.title)}
            target="_blank"
            rel="noopener noreferrer"
            className="boutique_gold_btn ds_lb_cta"
            svgIcon={<BoutiqueWhatsAppIcon width={18} height={18} />}
          >
            Get This Design Stitched
          </CommonButton>
        </div>

        {related.length > 0 && (
          <div className="ds_lb_related">
            <h4 className="ds_lb_related_title">Related Designs</h4>
            <div className="ds_lb_related_grid">
              <AnimatePresence>
                {related.slice(0, 4).map((item) => (
                  <motion.button
                    key={item.id}
                    type="button"
                    className="ds_lb_related_card"
                    onClick={() => onOpenRelated?.(item)}
                    whileHover={{ y: -3 }}
                  >
                    <Image
                      src={item.thumbnailImage}
                      alt={item.title}
                      width={140}
                      height={170}
                      unoptimized={item.thumbnailImage.startsWith("http")}
                    />
                    <span>{item.title}</span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </CommonModal>
  );
};

export default DesignStudioLightboxModal;
