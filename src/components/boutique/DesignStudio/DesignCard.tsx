"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { StudioDesign } from "@/lib/admin/types";
import { buildDesignStudioWhatsAppUrl } from "@/utils/whatsapp";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { BoutiqueWhatsAppIcon } from "@/assets/icons/svgIcon";
import DesignBadges from "./DesignBadges";

type DesignCardProps = {
  design: StudioDesign;
  onOpen?: (design: StudioDesign) => void;
  index?: number;
};

const DesignCard: React.FC<DesignCardProps> = ({ design, onOpen, index = 0 }) => {
  const thumb = design.thumbnailImage?.trim() || "/images/kide_war1.png";

  return (
    <motion.article
      className="ds_card"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.35) }}
    >
      <button
        type="button"
        className="ds_card_media_btn"
        onClick={() => onOpen?.(design)}
        aria-label={`View ${design.title}`}
      >
        <div className="ds_card_media">
          <Image
            src={thumb}
            alt={design.title}
            fill
            className="ds_card_image"
            sizes="(max-width: 576px) 100vw, (max-width: 991px) 50vw, 33vw"
            unoptimized={thumb.startsWith("http")}
          />
          <DesignBadges design={design} />
          <span className="ds_card_overlay">
            <span className="ds_card_overlay_title">{design.title}</span>
            {design.stitchingPrice && (
              <span className="ds_card_overlay_price">{design.stitchingPrice}</span>
            )}
          </span>
        </div>
      </button>
      <div className="ds_card_body">
        <h3 className="ds_card_title">{design.title}</h3>
        <p className="ds_card_desc">{design.shortDescription}</p>
        <div className="ds_card_actions">
          <CommonButton
            className="ds_card_btn ds_card_btn_outline w-100"
            onClick={() => onOpen?.(design)}
          >
            View Design
          </CommonButton>
          <CommonButton
            role="link"
            to={buildDesignStudioWhatsAppUrl(design.title)}
            target="_blank"
            rel="noopener noreferrer"
            className="ds_card_btn ds_card_btn_wa w-100"
            svgIcon={<BoutiqueWhatsAppIcon width={16} height={16} />}
          >
            Stitch This
          </CommonButton>
        </div>
      </div>
    </motion.article>
  );
};

export default DesignCard;
