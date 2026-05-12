"use client";

import React from "react";
import { Container } from "react-bootstrap";
import { getWhatsAppUrl } from "@/utils/whatsapp";
import { BoutiqueWhatsAppIcon } from "@/assets/icons/svgIcon";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import "./CtaBannerSection.scss";

const CtaBannerSection: React.FC = () => {
  return (
    <section className="cta_banner_section">
      <Container>
        <div className="cta_banner_inner">
          <div className="cta_banner_text">
            <h3 className="cta_banner_title">Ready to Stitch Your Next Outfit?</h3>
            <p className="cta_banner_sub">
              Chat with us directly on WhatsApp. Share your design, fabric, service type,
              and measurements. We will guide you from idea to final fitting.
            </p>
          </div>
          <CommonButton
            role="link"
            to={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="boutique_gold_btn"
            svgIcon={<BoutiqueWhatsAppIcon width={18} height={18} />}
          >
            Start Ordering Now
          </CommonButton>
        </div>
      </Container>
    </section>
  );
};

export default CtaBannerSection;
