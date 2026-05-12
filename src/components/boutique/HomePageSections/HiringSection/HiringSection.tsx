"use client";

import React from "react";
import { Container } from "react-bootstrap";
import { BoutiqueWhatsAppIcon } from "@/assets/icons/svgIcon";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import "./HiringSection.scss";

const roles = [
  { icon: "🧵", title: "Stitching", sub: "Ladies Suits" },
  { icon: "👩‍💼", title: "Customer Handling", sub: "Front Desk" },
  { icon: "📏", title: "Measurement", sub: "Taking & Fitting" },
  { icon: "✂️", title: "Finishing", sub: "& Final Fitting" },
];

const HiringSection: React.FC = () => {
  return (
    <section className="hiring_section" id="hiring">
      <Container>
        <div className="hiring_wrapper">
          <div className="hiring_badge_col">
            <div className="hiring_pulse_ring" />
            <div className="hiring_center_badge">
              <span className="hiring_badge_eyebrow">Now Hiring</span>
              <span className="hiring_badge_main">WE ARE<br />HIRING!</span>
              <span className="hiring_badge_sub">Female Staff Required</span>
            </div>
          </div>

          <div className="hiring_content_col">
            <span className="section_label">Open Positions</span>
            <h2 className="hiring_heading">Join Our Boutique Team</h2>
            <p className="hiring_intro">
              We are looking for passionate, skilled women to join Sara Royal Boutique.
              Be part of a growing team where your craft is valued and celebrated.
            </p>

            <div className="hiring_roles_grid">
              {roles.map((role) => (
                <div className="hiring_role_card" key={role.title}>
                  <span className="hiring_role_icon">{role.icon}</span>
                  <div className="hiring_role_info">
                    <span className="hiring_role_title">{role.title}</span>
                    <span className="hiring_role_sub">{role.sub}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="hiring_contact_row">
              <div className="hiring_contact_info">
                <span className="hiring_contact_item">
                  <span className="hiring_contact_icon">📍</span>
                  #270, Mata Gujri Avenue, Kharar, Punjab
                </span>
                <a href="tel:+919779379004" className="hiring_phone">
                  <span className="hiring_contact_icon">📞</span>
                  +91 97793-79004
                </a>
              </div>

              <CommonButton
                role="link"
                to="https://wa.me/919779379004?text=Hello%2C%20I%20am%20interested%20in%20the%20job%20opening%20at%20Sara%20Royal%20Boutique."
                target="_blank"
                rel="noopener noreferrer"
                className="boutique_gold_btn"
                svgIcon={<BoutiqueWhatsAppIcon width={17} height={17} />}
              >
                Apply on WhatsApp
              </CommonButton>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default HiringSection;
