"use client";

import React from "react";
import Image from "next/image";
import { Container, Row, Col } from "react-bootstrap";
import Header from "@/components/boutique/Header/Header";
import BoutiqueFooter from "@/components/boutique/Footer/BoutiqueFooter";
import SeoFaqSection from "@/components/boutique/SeoFaqSection/SeoFaqSection";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { BoutiqueWhatsAppIcon } from "@/assets/icons/svgIcon";
import { getWhatsAppUrl } from "@/utils/whatsapp";
import type { SeoPageConfig } from "@/data/seoPages";
import "./SeoLandingPage.scss";

type SeoLandingPageProps = {
  config: SeoPageConfig;
};

const SeoLandingPage: React.FC<SeoLandingPageProps> = ({ config }) => {
  const whatsappUrl = getWhatsAppUrl(config.whatsappMessage);

  return (
    <div className="boutique_page seo_landing_page">
      <Header />

      <section className="seo_page_hero">
        <div className="seo_page_hero_bg" />
        <Container className="seo_page_hero_inner">
          <div className="seo_page_hero_text">
            <span className="section_label">{config.heroLabel}</span>
            <h1>{config.heroTitle}</h1>
            <p>{config.heroSubtitle}</p>
            <CommonButton
              role="link"
              to={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="boutique_gold_btn"
              svgIcon={<BoutiqueWhatsAppIcon width={18} height={18} />}
            >
              Book on WhatsApp
            </CommonButton>
          </div>
          <div className="seo_page_hero_image" aria-hidden="true">
            <Image
              src={config.heroImage}
              alt={config.heroTitle}
              fill
              sizes="(max-width: 991px) 86vw, 36vw"
              priority
            />
          </div>
        </Container>
      </section>

      <section className="seo_page_intro py-section">
        <Container>
          <Row className="justify-content-center">
            <Col lg={10} xl={8} className="text-center">
              <h2 className="section_title">{config.introTitle}</h2>
              {config.introParagraphs.map((para) => (
                <p key={para.slice(0, 24)} className="seo_page_intro_para">
                  {para}
                </p>
              ))}
            </Col>
          </Row>
        </Container>
      </section>

      <section className="seo_page_highlights py-section">
        <Container>
          <div className="text-center mb-5">
            <span className="section_label">Why Sara Royal</span>
            <h2 className="section_title">Service Highlights</h2>
          </div>
          <Row className="g-4">
            {config.highlights.map((item) => (
              <Col key={item.title} xs={12} sm={6} lg={3}>
                <article className="seo_highlight_card">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      <SeoFaqSection items={config.faqs} />

      <section className="seo_page_cta py-section">
        <Container>
          <div className="seo_page_cta_inner">
            <div>
              <h2 className="seo_page_cta_title">Ready to Get Started?</h2>
              <p className="seo_page_cta_sub">
                Message us on WhatsApp with your design, measurements, and fabric details.
                We respond quickly with guidance and booking support.
              </p>
            </div>
            <CommonButton
              role="link"
              to={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="boutique_gold_btn"
              svgIcon={<BoutiqueWhatsAppIcon width={18} height={18} />}
            >
              Chat on WhatsApp
            </CommonButton>
          </div>
        </Container>
      </section>

      <BoutiqueFooter />
    </div>
  );
};

export default SeoLandingPage;
