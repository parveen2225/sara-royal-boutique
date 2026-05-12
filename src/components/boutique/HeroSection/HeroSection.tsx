import React from "react";
import Image from "next/image";
import { getWhatsAppUrl } from "@/utils/whatsapp";
import { BoutiqueWhatsAppIcon, BoutiqueArrowRightIcon } from "@/assets/icons/svgIcon";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import "./HeroSection.scss";
import plazzo2 from "../../../../public/images/plazzo_2.jpg";

interface HeroSectionProps {
  headline?: string;
  subtext?: string;
  backgroundImage?: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  headline = "Stitch Your Style, Feel Like Royalty",
  subtext = "Sara Royal Boutique creates premium ladies dress stitching with perfect fitting, elegant finishing, and designs made around your personal style.",
  backgroundImage = "/images/punjabi_4.jpg",
}) => {
  return (
    <section className="hero_section" aria-label="Hero">
      <div className="hero_backdrop" style={{ backgroundImage: `url("${backgroundImage}")` }} />
      <div className="hero_overlay" />
      <div className="hero_blur hero_blur_left" aria-hidden="true" />
      <div className="hero_blur hero_blur_right" aria-hidden="true" />

      <div className="hero_shell">
        <div className="hero_content">
          <span className="hero_brand_label">Sara Royal Boutique</span>
          <h1 className="hero_headline">{headline}</h1>
          <p className="hero_subtext">{subtext}</p>

          <div className="hero_actions">
            <CommonButton
              role="link"
              to={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="hero_btn hero_btn_primary"
              svgIcon={<BoutiqueWhatsAppIcon width={18} height={18} />}
            >
              Order on WhatsApp
            </CommonButton>
            <CommonButton role="link" to="/services" className="hero_btn hero_btn_outline">
              View Services
              <BoutiqueArrowRightIcon width={16} height={16} />
            </CommonButton>
          </div>

          <div className="hero_trust_row" aria-hidden="true">
            <span className="trust_chip">Perfect Fitting</span>
            <span className="trust_chip">Premium Finish</span>
            <span className="trust_chip">Latest Designs</span>
          </div>
        </div>

        <div className="hero_visual" aria-hidden="true">
          <div className="hero_visual_frame">
            <Image
              src={plazzo2}
              alt="Luxury boutique model"
              fill
              sizes="(max-width: 991px) 90vw, 40vw"
              className="hero_visual_image"
              priority
            />
            <div className="hero_visual_tint" />
          </div>

          <div className="hero_visual_badge top_badge">
            <span className="badge_label">Exclusive</span>
            <span className="badge_value">Ladies Boutique</span>
          </div>

          <div className="hero_visual_badge bottom_badge">
            <span className="badge_label">Signature Service</span>
            <span className="badge_value">Custom Stitching</span>
          </div>

          <div className="hero_stats">
            <div className="hero_stat">
              <span className="stat_value">500+</span>
              <span className="stat_label">Happy Clients</span>
            </div>
            <div className="hero_stat">
              <span className="stat_value">100%</span>
              <span className="stat_label">Custom Fit</span>
            </div>
            <div className="hero_stat">
              <span className="stat_value">5.0</span>
              <span className="stat_label">Customer Rating</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hero_scroll_indicator" aria-hidden="true">
        <span className="hero_scroll_line" />
        <span className="hero_scroll_text">Scroll</span>
      </div>
    </section>
  );
};

export default HeroSection;
