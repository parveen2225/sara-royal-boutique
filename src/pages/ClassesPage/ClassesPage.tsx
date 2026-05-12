"use client";

import React from "react";
import { Col, Container, Row } from "react-bootstrap";
import Link from "next/link";
import BoutiqueNavbar from "@/components/boutique/Header/Header";
import BoutiqueFooter from "@/components/boutique/Footer/BoutiqueFooter";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { BoutiqueWhatsAppIcon } from "@/assets/icons/svgIcon";
import { getWhatsAppUrl } from "@/utils/whatsapp";
import "./ClassesPage.scss";

const WHATSAPP_CLASSES = `https://wa.me/919779379004?text=${encodeURIComponent("Hello! I'm interested in joining the Sewing Classes at Sara Royal Boutique. Please share more details.")}`;

const CURRICULUM = [
  { icon: "🧵", title: "Stitching", sub: "Basic to Advanced" },
  { icon: "📏", title: "Measurement & Fitting", sub: "Perfect sizing" },
  { icon: "✂️", title: "Designing & Finishing", sub: "Professional look" },
  { icon: "🪡", title: "Practical Training", sub: "Hands-on sessions" },
];

const FEATURES = [
  { icon: "📈", label: "Beginners to Advanced" },
  { icon: "🎓", label: "Practical Learning" },
  { icon: "👩‍🏫", label: "Personal Attention" },
  { icon: "📋", label: "Certificate Provided" },
  { icon: "🕐", label: "Flexible Timings" },
];

const ClassesPage: React.FC = () => {
  return (
    <div className="boutique_page classes_page">
      <BoutiqueNavbar />

      <section className="classes_hero">
        <div className="classes_hero_overlay" />
        <div className="classes_hero_orb orb1" aria-hidden="true" />
        <div className="classes_hero_orb orb2" aria-hidden="true" />
        <Container className="classes_hero_content">
          <div className="classes_hero_split">
            <div className="classes_hero_left">
              <span className="classes_eyebrow">✦ Sara Royal Boutique</span>
              <h1 className="classes_hero_title">
                <span className="classes_hero_sewing">Sewing</span>
                <span className="classes_hero_classes">Classes</span>
              </h1>
              <div className="classes_tagline_strip">
                <span>LEARN</span>
                <span className="tagline_sep">|</span>
                <span>STITCH</span>
                <span className="tagline_sep">|</span>
                <span>GROW</span>
              </div>
              <p className="classes_hero_sub">♥ Learn a skill, create your future ♥</p>
              <div className="classes_hero_actions">
                <CommonButton
                  role="link"
                  to={WHATSAPP_CLASSES}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="classes_cta_primary"
                  svgIcon={<BoutiqueWhatsAppIcon width={18} height={18} />}
                >
                  Enroll on WhatsApp
                </CommonButton>
                <Link href="#curriculum" className="classes_cta_secondary">
                  See Curriculum ↓
                </Link>
              </div>
            </div>
            <div className="classes_hero_right">
              <div className="classes_stat_card">
                <span className="stat_num">₹1,500</span>
                <span className="stat_text">Per Person · All Levels</span>
              </div>
              <div className="classes_stat_card">
                <span className="stat_num">5+</span>
                <span className="stat_text">Skills You Will Learn</span>
              </div>
              <div className="classes_stat_card">
                <span className="stat_num">✓</span>
                <span className="stat_text">Certificate Provided</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="classes_curriculum_section" id="curriculum">
        <Container>
          <div className="classes_section_label_wrap">
            <span className="classes_section_badge">WHAT YOU WILL LEARN</span>
          </div>
          <Row className="g-4 g-lg-4 justify-content-center">
            {CURRICULUM.map((item) => (
              <Col key={item.title} xs={6} sm={6} md={3}>
                <div className="curriculum_card">
                  <div className="curriculum_icon">{item.icon}</div>
                  <h3 className="curriculum_title">{item.title}</h3>
                  <p className="curriculum_sub">{item.sub}</p>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      <section className="classes_fee_section">
        <Container>
          <div className="classes_fee_card">
            <div className="fee_icon_wrap">
              <span className="fee_icon">₹</span>
            </div>
            <div className="fee_details">
              <span className="fee_label">COURSE FEES</span>
              <div className="fee_amount">₹1,500<span className="fee_slash">/</span><span className="fee_per">-</span></div>
              <span className="fee_per_person">PER PERSON</span>
            </div>
            <CommonButton
              role="link"
              to={WHATSAPP_CLASSES}
              target="_blank"
              rel="noopener noreferrer"
              className="classes_cta_primary fee_cta"
            >
              Book Your Seat
            </CommonButton>
          </div>
        </Container>
      </section>

      <section className="classes_features_section">
        <Container>
          <div className="classes_section_label_wrap">
            <span className="classes_section_badge">OUR FEATURES</span>
          </div>
          <Row className="g-4 justify-content-center">
            {FEATURES.map((f) => (
              <Col key={f.label} xs={6} sm={4} md={2} className="text-center">
                <div className="feature_card">
                  <div className="feature_icon">{f.icon}</div>
                  <p className="feature_label">{f.label}</p>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      <section className="classes_join_section">
        <Container>
          <Row className="g-0 classes_join_inner">
            <Col xs={12} md={6} className="classes_join_cta_col">
              <div className="classes_join_cta">
                <h2 className="classes_join_title">JOIN TODAY</h2>
                <p className="classes_join_sub">
                  and turn your passion<br />into a profession! ♥
                </p>
                <CommonButton
                  role="link"
                  to={WHATSAPP_CLASSES}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="classes_cta_primary"
                  svgIcon={<BoutiqueWhatsAppIcon width={18} height={18} />}
                >
                  Enroll Now
                </CommonButton>
              </div>
            </Col>
            <Col xs={12} md={6} className="classes_contact_col">
              <div className="classes_contact_info">
                <div className="contact_info_row">
                  <span className="contact_info_icon">📍</span>
                  <div>
                    <p className="contact_info_label">ADDRESS</p>
                    <p className="contact_info_value">#270, Mata Gujri Avenue,<br />Kharar, Punjab.</p>
                  </div>
                </div>
                <div className="contact_info_row">
                  <span className="contact_info_icon">📞</span>
                  <div>
                    <p className="contact_info_label">CONTACT</p>
                    <a href="tel:+919779379004" className="contact_info_phone">+91 97793-79004</a>
                    <p className="contact_info_wa">(WhatsApp / Call)</p>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
          <p className="classes_footer_motto">♥ LEARN TODAY, CREATE TOMORROW ♥</p>
        </Container>
      </section>

      <BoutiqueFooter />
    </div>
  );
};

export default ClassesPage;
