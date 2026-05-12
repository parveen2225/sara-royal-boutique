"use client";

import React from "react";
import { Container } from "react-bootstrap";
import Image from "next/image";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import "./AboutSection.scss";

const stats = [
  { number: "500+", label: "Happy Clients" },
  { number: "100%", label: "Custom Fitting" },
  { number: "8+", label: "Years of Craft" },
  { number: "48h", label: "Quality Promise" },
];

const AboutSection: React.FC = () => {
  return (
    <section className="about_section" id="about">
      <Container>
        <div className="about_grid">
          <div className="about_visual_col">
            <div className="about_image_frame">
              <div className="about_image_accent" />
              <div className="about_image_wrap">
                <Image
                  src="/images/punjabi_2.jpg"
                  alt="Sara Royal Boutique custom stitched suit"
                  width={700}
                  height={900}
                  className="about_image"
                  priority
                />
                <div className="about_image_overlay" />
              </div>

              <div className="about_years_badge">
                <span className="about_years_number">8+</span>
                <span className="about_years_text">Years of<br />Craft</span>
              </div>

              <div className="about_msme_badge">
                <span className="about_msme_icon">🏛️</span>
                <div className="about_msme_info">
                  <span className="about_msme_label">Govt. Registered MSME</span>
                  <span className="about_msme_reg">UDYAM-PB-20-0120288</span>
                </div>
              </div>
            </div>
          </div>

          <div className="about_content_col">
            <span className="section_label">Our Story</span>
            <h2 className="about_heading">
              Where <em>Tradition</em><br />Meets Modern Style
            </h2>
            <p className="about_desc">
              Sara Royal Boutique is dedicated to refined ladies dress stitching,
              from everyday suits and kurtis to designer outfits for special occasions.
              Every piece is shaped with careful measurements, neat finishing, and a
              graceful boutique look.
            </p>
            <p className="about_desc">
              Share your fabric, inspiration, and fitting preferences with us. We turn
              them into comfortable, confident, and elegant outfits made especially for you.
            </p>

            <div className="about_stats_grid">
              {stats.map((stat) => (
                <div className="about_stat_card" key={stat.label}>
                  <span className="about_stat_number">{stat.number}</span>
                  <span className="about_stat_label">{stat.label}</span>
                </div>
              ))}
            </div>

            <CommonButton role="link" to="/about" className="boutique_gold_btn">
              Read Our Story
            </CommonButton>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default AboutSection;
