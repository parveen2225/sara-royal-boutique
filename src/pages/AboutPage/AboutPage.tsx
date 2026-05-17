import React from "react";
import Image from "next/image";
import { Col, Container, Row } from "react-bootstrap";
import BoutiqueNavbar from "@/components/boutique/Header/Header";
import BoutiqueFooter from "@/components/boutique/Footer/BoutiqueFooter";
import { getWhatsAppUrl } from "@/utils/whatsapp";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import "./AboutPage.scss";
import aboutImage from "../../../public/images/bridal_couture_3.png";
import kurti3 from "../../../public/images/Blouse_Stitching_1.png";
import punjabi1 from "../../../public/images/punjabi_1.jpg";
import punjabi3 from "../../../public/images/punjabi_3.jpg";

const VALUES = [
  {
    icon: "✦",
    title: "Perfect Fitting",
    desc: "Every outfit is cut and stitched around your measurements so it feels comfortable, graceful, and made especially for you.",
  },
  {
    icon: "◈",
    title: "Premium Quality",
    desc: "From clean seams to polished finishing, each order is handled with boutique-level care and reliable craftsmanship.",
  },
  {
    icon: "◇",
    title: "Latest Designs",
    desc: "We blend traditional silhouettes with modern boutique styling for suits, kurtis, blouses, gowns, and designer wear.",
  },
  {
    icon: "⊕",
    title: "Personal Attention",
    desc: "We listen to your ideas, guide your choices, and make sure every outfit reflects your taste and occasion.",
  },
];

const TEAM = [
  {
    name: "Sara",
    role: "Founder & Boutique Designer",
    image: punjabi1,
  },
  {
    name: "Aisha",
    role: "Stitching Specialist",
    image: kurti3,
  },
  {
    name: "Zara",
    role: "Fitting Consultant",
    image: punjabi3,
  },
];

const AboutPage: React.FC = () => {
  return (
    <div className="boutique_page about_page">
      <BoutiqueNavbar />

      
      <section className="about_hero">
        <div className="about_hero_overlay" />
        <div className="about_hero_content">
          <span className="about_hero_label">Our Story</span>
          <h1 className="about_hero_title">Ladies Stitching with Royal Finishing</h1>
          <p className="about_hero_sub">
            Perfect fitting, premium finish, and custom designs for every occasion
          </p>
        </div>
      </section>

      
      <section className="about_story py-section-about">
        <Container>
          <Row className="align-items-center g-5">
            <Col xs={12} md={6}>
              <div className="about_story_img_wrap">
                <Image
                  src={aboutImage}
                  alt="Sara Royal Boutique stitched ladies suit"
                  width={580}
                  height={680}
                  className="about_story_img"
                />
              </div>
            </Col>
            <Col xs={12} md={6}>
              <div className="about_story_text">
                <span className="section_label_about">Who We Are</span>
                <h2 className="about_section_title">
                  Where Every Outfit Is Made Around You
                </h2>
                <p>
                  Sara Royal Boutique offers professional ladies dress stitching
                  for suits, salwar, kurtis, blouses, gowns, designer outfits,
                  kids wear, and alterations. Our work is guided by accurate
                  measurements, clean finishing, and a polished boutique look.
                </p>
                <p>
                  We believe great stitching should feel effortless to wear and
                  beautiful to look at. From daily essentials to occasion wear,
                  each piece is planned with your fabric, comfort, and personal
                  style in mind.
                </p>
                <p>
                  Whether you bring a reference design or want guidance from
                  scratch, we help shape your idea into a refined outfit that
                  looks elegant and fits with confidence.
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      
      <section className="about_mission">
        <Container>
          <div className="mission_inner">
            <span className="section_label_about">Our Mission</span>
            <h2 className="about_section_title text-center">
              Crafted for the Modern Royal
            </h2>
            <p className="mission_text">
              Our mission is simple — to give every woman the gift of a
              perfectly fitted, beautifully crafted suit that tells her story.
              We are committed to preserving the artistry of hand embroidery
              and traditional stitching while embracing contemporary design
              aesthetics.
            </p>
          </div>
        </Container>
      </section>

      
      <section className="about_values py-section-about">
        <Container>
          <div className="text-center mb-5">
            <span className="section_label_about">Our Values</span>
            <h2 className="about_section_title">What Sets Us Apart</h2>
          </div>
          <Row className="g-4">
            {VALUES.map((v) => (
              <Col key={v.title} xs={12} sm={6} lg={3}>
                <div className="value_card">
                  <span className="value_icon">{v.icon}</span>
                  <h5 className="value_title">{v.title}</h5>
                  <p className="value_desc">{v.desc}</p>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      
      <section className="about_team py-section-about">
        <Container>
          <div className="text-center mb-5">
            <span className="section_label_about">Meet the Team</span>
            <h2 className="about_section_title">The Artists Behind Your Look</h2>
          </div>
          <Row className="g-4 justify-content-center">
            {TEAM.map((member) => (
              <Col key={member.name} xs={12} sm={6} lg={4}>
                <div className="team_card">
                  <div className="team_card_img_wrap">
                    <Image
                      src={member.image}
                      alt={member.name}
                      width={320}
                      height={380}
                      className="team_card_img"
                    />
                  </div>
                  <div className="team_card_body">
                    <h5 className="team_card_name">{member.name}</h5>
                    <p className="team_card_role">{member.role}</p>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      
      <section className="about_udyam py-section-about">
        <Container>
          <div className="text-center mb-5">
            <span className="section_label_about">Government Recognition</span>
            <h2 className="about_section_title">Udyam Registration Certificate</h2>
            <p className="udyam_intro">
              Sara Royal Boutique is officially registered as a{" "}
              <strong>Micro Enterprise</strong> under the Government of
              India&apos;s MSME scheme.
            </p>
          </div>

          <div className="udyam_card">
            <div className="udyam_header">
              <div className="udyam_seal">
                <span className="udyam_seal_icon">🏛️</span>
                <span className="udyam_seal_text">MSME</span>
              </div>
              <div className="udyam_header_text">
                <h3 className="udyam_title">UDYAM REGISTRATION CERTIFICATE</h3>
                <p className="udyam_subtitle">
                  Ministry of Micro, Small &amp; Medium Enterprises, Government of India
                </p>
              </div>
            </div>

            <div className="udyam_body">
              <div className="udyam_row udyam_row--highlight">
                <span className="udyam_key">Udyam Registration Number</span>
                <span className="udyam_value udyam_value--reg">UDYAM-PB-20-0120288</span>
              </div>
              <div className="udyam_row">
                <span className="udyam_key">Name of Enterprise</span>
                <span className="udyam_value">Sara Royal Boutique</span>
              </div>
              <div className="udyam_row">
                <span className="udyam_key">Type of Enterprise</span>
                <span className="udyam_value">
                  <span className="udyam_badge">Micro</span>
                  &nbsp;· Classification Year: 2025‑26 · Date: 29/01/2026
                </span>
              </div>
              <div className="udyam_row">
                <span className="udyam_key">Major Activity</span>
                <span className="udyam_value">
                  <span className="udyam_badge udyam_badge--service">Services</span>
                </span>
              </div>
              <div className="udyam_row">
                <span className="udyam_key">Social Category of Entrepreneur</span>
                <span className="udyam_value">OBC</span>
              </div>
              <div className="udyam_row">
                <span className="udyam_key">Official Address</span>
                <span className="udyam_value">
                  #270, Mata Gujri Avenue, Kharar,<br />
                  SAS Nagar, Punjab – 140301
                </span>
              </div>
              <div className="udyam_row">
                <span className="udyam_key">Mobile</span>
                <span className="udyam_value">9023950002</span>
              </div>
              <div className="udyam_row">
                <span className="udyam_key">Date of Incorporation</span>
                <span className="udyam_value">15/04/2024</span>
              </div>
              <div className="udyam_row">
                <span className="udyam_key">Date of Commencement of Business</span>
                <span className="udyam_value">15/04/2024</span>
              </div>
              <div className="udyam_row udyam_row--highlight">
                <span className="udyam_key">Date of Udyam Registration</span>
                <span className="udyam_value">29/01/2026</span>
              </div>
            </div>

            <div className="udyam_footer">
              <span className="udyam_disclaimer">
                This is a computer-generated statement. No signature required.
                Verified on udyamregistration.gov.in
              </span>
              <a
                href="https://udyamregistration.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="udyam_verify_link"
              >
                Verify on MSME Portal ↗
              </a>
            </div>
          </div>
        </Container>
      </section>

      <section className="about_cta">
        <Container>
          <div className="about_cta_inner">
            <h3 className="about_cta_title">
              Ready to Experience the Difference?
            </h3>
            <p className="about_cta_sub">
              Order your custom design via WhatsApp and let us bring your
              vision to life.
            </p>
            <div className="about_cta_btns">
              <CommonButton
                role="link"
                to={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="about_cta_btn_gold"
              >
                Order on WhatsApp
              </CommonButton>
              <CommonButton role="link" to="/collections" className="about_cta_btn_outline">
                Browse Collections
              </CommonButton>
            </div>
          </div>
        </Container>
      </section>

      <BoutiqueFooter />
    </div>
  );
};

export default AboutPage;
