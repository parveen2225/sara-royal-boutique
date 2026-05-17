"use client";

import React from "react";
import Image from "next/image";
import { Container } from "react-bootstrap";
import BoutiqueNavbar from "@/components/boutique/Header/Header";
import BoutiqueFooter from "@/components/boutique/Footer/BoutiqueFooter";
import ServicesSection from "@/components/ServicesSection";
import "./ServicesPage.scss";
import image1 from "../../../public/images/Royal_Musta_d_Silk_Salwar_Suit_3.png";

const ServicesPage: React.FC = () => {
  return (
    <div className="boutique_page services_page">
      <BoutiqueNavbar />

      <section className="services_page_hero">
        <div className="services_page_hero_bg" />
        <Container className="services_page_hero_inner">
          <div className="services_page_hero_text">
            <span className="section_label">Sara Royal Boutique</span>
            <h1>Professional Ladies Dress Stitching</h1>
            <p>
              Premium custom stitching for suits, kurtis, gowns, blouses,
              alterations, and made-to-measure boutique outfits.
            </p>
          </div>
          <div className="services_page_hero_image" aria-hidden="true">
            <Image
              src={image1}
              alt="Sara Royal Boutique designer suit"
              fill
              sizes="(max-width: 991px) 86vw, 36vw"
              priority
            />
          </div>
        </Container>
      </section>

      <ServicesSection
        title="Our Complete Services"
        subtitle="Choose the service you need and share your design, measurements, and fabric details. We craft every outfit with balanced fitting, clean finishing, and boutique-level care."
        showPageLink={false}
        className="services_page_listing"
      />

      <BoutiqueFooter />
    </div>
  );
};

export default ServicesPage;
