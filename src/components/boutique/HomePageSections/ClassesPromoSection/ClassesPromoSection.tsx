"use client";

import React from "react";
import Image from "next/image";
import { Container } from "react-bootstrap";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import {
  CLASSES_IMAGES,
  CLASSES_PROMO_POINTS,
  CLASSES_WHATSAPP_URL,
} from "@/data/classesContent";
import { BoutiqueWhatsAppIcon } from "@/assets/icons/svgIcon";
import "./ClassesPromoSection.scss";

const ClassesPromoSection: React.FC = () => {
  return (
    <section className="classes_promo_section" id="classes">
      <Container>
        <div className="classes_promo_grid">
          <div className="classes_promo_visual">
            <div className="classes_promo_visual_frame">
              <div className="classes_promo_visual_accent" aria-hidden="true" />
              <div className="classes_promo_visual_main">
                <Image
                  src={CLASSES_IMAGES.promoMain}
                  alt="Sewing class at Sara Royal Boutique"
                  width={640}
                  height={780}
                  className="classes_promo_visual_image"
                  sizes="(max-width: 991px) 90vw, 42vw"
                />
              </div>
              <div className="classes_promo_visual_secondary">
                <Image
                  src={CLASSES_IMAGES.promoAccent}
                  alt="Student practicing stitching techniques"
                  width={280}
                  height={340}
                  className="classes_promo_visual_image"
                  sizes="(max-width: 991px) 40vw, 18vw"
                />
              </div>
              <div className="classes_promo_visual_badge">
                <span className="classes_promo_visual_badge_value">₹1,500</span>
                <span className="classes_promo_visual_badge_label">Per Person</span>
              </div>
            </div>
          </div>

          <div className="classes_promo_content">
            <span className="section_label">Learn With Us</span>
            <h2 className="classes_promo_title">
              Sewing <em>Classes</em>
            </h2>
            <p className="classes_promo_desc">
              Master the art of boutique stitching with guided, hands-on training at Sara
              Royal Boutique. From first stitch to finished outfit — learn skills that last
              a lifetime.
            </p>

            <div className="classes_promo_tags">
              <span>Learn</span>
              <span className="classes_promo_tags_sep">|</span>
              <span>Stitch</span>
              <span className="classes_promo_tags_sep">|</span>
              <span>Grow</span>
            </div>

            <ul className="classes_promo_list">
              {CLASSES_PROMO_POINTS.map((point) => (
                <li key={point}>
                  <span className="classes_promo_list_icon" aria-hidden="true">
                    ✦
                  </span>
                  {point}
                </li>
              ))}
            </ul>

            <div className="classes_promo_actions">
              <CommonButton role="link" to="/classes" className="boutique_gold_btn classes_promo_btn">
                Explore Classes
              </CommonButton>
              <CommonButton
                role="link"
                to={CLASSES_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="classes_promo_wa_btn"
                svgIcon={<BoutiqueWhatsAppIcon width={18} height={18} />}
              >
                Enroll on WhatsApp
              </CommonButton>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default ClassesPromoSection;
