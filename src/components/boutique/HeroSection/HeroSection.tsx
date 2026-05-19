import React from "react";
import Image from "next/image";
import { getWhatsAppUrl } from "@/utils/whatsapp";
import { BoutiqueWhatsAppIcon, BoutiqueArrowRightIcon } from "@/assets/icons/svgIcon";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { type HeroBanner } from "@/lib/admin/types";
import "./HeroSection.scss";
import defaultVisual from "../../../../public/images/kide_war1.png";

const DEFAULT_HEADLINE = (
  <>
    Stitch <span className="yellow_text">Your Style</span>, Feel Like Royalty
  </>
);

const DEFAULT_SUBTEXT =
  "Sara Royal Boutique creates premium ladies dress stitching with perfect fitting, elegant finishing, and designs made around your personal style.";

interface HeroSectionProps {
  banner?: HeroBanner | null;
}

const HeroSection: React.FC<HeroSectionProps> = ({ banner }) => {
  const headline = banner?.title?.trim() ? banner.title.trim() : DEFAULT_HEADLINE;
  const subtext = banner?.subtitle?.trim() || DEFAULT_SUBTEXT;
  const visualSrc = banner?.image?.trim() || defaultVisual;
  const isRemoteVisual = typeof visualSrc === "string" && visualSrc.startsWith("http");
  const primaryButtonText = banner?.buttonText?.trim() || "Order on WhatsApp";
  const primaryButtonLink = banner?.buttonLink?.trim() || getWhatsAppUrl();
  const openPrimaryInNewTab =
    /^https?:\/\//i.test(primaryButtonLink) || primaryButtonLink.includes("wa.me");

  return (
    <section className="hero_section" aria-label="Hero">
      <div className="hero_backdrop" style={{ backgroundImage: 'url("/images/punjabi_3.jpg")' }} />
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
              to={primaryButtonLink}
              target={openPrimaryInNewTab ? "_blank" : undefined}
              rel={openPrimaryInNewTab ? "noopener noreferrer" : undefined}
              className="hero_btn hero_btn_primary"
              svgIcon={<BoutiqueWhatsAppIcon width={18} height={18} />}
            >
              {primaryButtonText}
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
              src={visualSrc}
              alt="Luxury boutique hero"
              fill
              sizes="(max-width: 991px) 90vw, 40vw"
              className="hero_visual_image"
              priority
              unoptimized={isRemoteVisual}
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
              <span className="stat_value">100+</span>
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
