"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Col, Container, Row } from "react-bootstrap";
import BoutiqueNavbar from "@/components/boutique/Header/Header";
import BoutiqueFooter from "@/components/boutique/Footer/BoutiqueFooter";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { BoutiqueWhatsAppIcon } from "@/assets/icons/svgIcon";
import {
  CLASSES_CURRICULUM,
  CLASSES_FEATURES,
  CLASSES_IMAGES,
  CLASSES_STATS,
  CLASSES_WHATSAPP_URL,
} from "@/data/classesContent";
import "./ClassesPage.scss";

const ClassesPage: React.FC = () => {
  return (
    <div className="boutique_page classes_page">
      <BoutiqueNavbar />

      <section className="classes_hero">
        <div className="classes_hero_bg">
          <Image
            src={CLASSES_IMAGES.hero}
            alt=""
            fill
            priority
            sizes="100vw"
            className="classes_hero_bg_image"
          />
        </div>
        <div className="classes_hero_overlay" aria-hidden="true" />
        <div className="classes_hero_glow classes_hero_glow_one" aria-hidden="true" />
        <div className="classes_hero_glow classes_hero_glow_two" aria-hidden="true" />

        <Container className="classes_hero_container">
          <div className="classes_hero_grid">
            <div className="classes_hero_copy">
              <span className="classes_hero_eyebrow">✦ Sara Royal Boutique</span>
              <h1 className="classes_hero_title">
                <span className="classes_hero_title_line">Sewing</span>
                <span className="classes_hero_title_accent">Classes</span>
              </h1>
              <p className="classes_hero_lead">
                Learn boutique-level stitching with personal guidance, practical sessions,
                and a certificate to mark your journey from beginner to confident creator.
              </p>
              <div className="classes_hero_pills">
                <span>Learn</span>
                <span className="classes_hero_pills_sep">|</span>
                <span>Stitch</span>
                <span className="classes_hero_pills_sep">|</span>
                <span>Grow</span>
              </div>
              <div className="classes_hero_actions">
                <CommonButton
                  role="link"
                  to={CLASSES_WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="classes_btn classes_btn_primary"
                  svgIcon={<BoutiqueWhatsAppIcon width={18} height={18} />}
                >
                  Enroll on WhatsApp
                </CommonButton>
                <Link href="#curriculum" className="classes_btn classes_btn_outline">
                  View Curriculum ↓
                </Link>
              </div>
            </div>

            <div className="classes_hero_media">
              <div className="classes_hero_media_frame">
                <div className="classes_hero_media_accent" aria-hidden="true" />
                <div className="classes_hero_media_main">
                  <Image
                    src={CLASSES_IMAGES.heroSecondary}
                    alt="Sewing classes at Sara Royal Boutique"
                    width={560}
                    height={680}
                    priority
                    sizes="(max-width: 991px) 90vw, 40vw"
                    className="classes_hero_media_image"
                  />
                </div>
                <div className="classes_hero_stats">
                  {CLASSES_STATS.map((stat) => (
                    <div key={stat.label} className="classes_hero_stat">
                      <span className="classes_hero_stat_value">{stat.value}</span>
                      <span className="classes_hero_stat_label">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="classes_intro">
        <Container>
          <div className="classes_intro_inner">
            <div className="classes_intro_copy">
              <span className="classes_section_label">Why Join Us</span>
              <h2 className="classes_section_title">
                A Creative Space to <em>Master Stitching</em>
              </h2>
              <p className="classes_intro_text">
                Our classes are designed for learners who want more than basics — neat finishing,
                confident fitting, and the boutique polish that turns hobby into skill.
              </p>
            </div>
            <div className="classes_intro_highlights">
              {CLASSES_FEATURES.slice(0, 3).map((feature) => (
                <div key={feature.label} className="classes_intro_highlight">
                  <span className="classes_intro_highlight_icon">{feature.icon}</span>
                  <span className="classes_intro_highlight_label">{feature.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="classes_curriculum" id="curriculum">
        <Container>
          <div className="classes_section_head">
            <span className="classes_section_label">Curriculum</span>
            <h2 className="classes_section_title">What You Will Learn</h2>
            <p className="classes_section_sub">
              Structured modules covering every step — from measurements to the final boutique finish.
            </p>
          </div>

          <Row className="g-4">
            {CLASSES_CURRICULUM.map((item) => (
              <Col key={item.title} xs={12} sm={6} lg={3}>
                <article className="classes_curriculum_card">
                  <div className="classes_curriculum_card_media">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 90vw, 25vw"
                      className="classes_curriculum_card_image"
                    />
                    <div className="classes_curriculum_card_overlay" />
                    <span className="classes_curriculum_card_icon">{item.icon}</span>
                  </div>
                  <div className="classes_curriculum_card_body">
                    <h3 className="classes_curriculum_card_title">{item.title}</h3>
                    <p className="classes_curriculum_card_sub">{item.sub}</p>
                  </div>
                </article>
              </Col>
            ))}
          </Row>
        </Container>
      </section>
      <section className="classes_fee">
        <Container>
          <div className="classes_fee_card">
            <div className="classes_fee_visual">
              <Image
                src={CLASSES_IMAGES.promoMain}
                alt="Sewing class session"
                fill
                sizes="(max-width: 767px) 100vw, 35vw"
                className="classes_fee_visual_image"
              />
              <div className="classes_fee_visual_overlay" />
            </div>
            <div className="classes_fee_content">
              <span className="classes_fee_label">Course Fees</span>
              <div className="classes_fee_amount">
                ₹1,500<span className="classes_fee_amount_suffix">/-</span>
              </div>
              <p className="classes_fee_note">Per person · All skill levels welcome</p>
              <CommonButton
                role="link"
                to={CLASSES_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="classes_btn classes_btn_primary classes_fee_cta"
              >
                Book Your Seat
              </CommonButton>
            </div>
          </div>
        </Container>
      </section>

      <section className="classes_features">
        <Container>
          <div className="classes_section_head">
            <span className="classes_section_label">Our Features</span>
            <h2 className="classes_section_title">Built for Real Learning</h2>
          </div>

          <Row className="g-3 g-md-4 justify-content-center">
            {CLASSES_FEATURES.map((feature) => (
              <Col key={feature.label} xs={6} sm={4} md={4} lg={2}>
                <div className="classes_feature_card">
                  <span className="classes_feature_icon">{feature.icon}</span>
                  <p className="classes_feature_label">{feature.label}</p>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      <section className="classes_join">
        <Container>
          <div className="classes_join_panel">
            <div className="classes_join_bg">
              <Image
                src={CLASSES_IMAGES.hero}
                alt=""
                fill
                sizes="100vw"
                className="classes_join_bg_image"
              />
            </div>
            <div className="classes_join_overlay" aria-hidden="true" />

            <Row className="g-0 classes_join_row">
              <Col xs={12} lg={6}>
                <div className="classes_join_cta">
                  <span className="classes_join_eyebrow">Start Your Journey</span>
                  <h2 className="classes_join_title">Join Today</h2>
                  <p className="classes_join_sub">
                    Turn your passion into a profession with guided training at Sara Royal
                    Boutique.
                  </p>
                  <CommonButton
                    role="link"
                    to={CLASSES_WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="classes_btn classes_btn_primary"
                    svgIcon={<BoutiqueWhatsAppIcon width={18} height={18} />}
                  >
                    Enroll Now
                  </CommonButton>
                </div>
              </Col>
              <Col xs={12} lg={6}>
                <div className="classes_join_contact">
                  <div className="classes_join_contact_row">
                    <span className="classes_join_contact_icon">📍</span>
                    <div>
                      <p className="classes_join_contact_label">Address</p>
                      <p className="classes_join_contact_value">
                        #270, Mata Gujri Avenue,
                        <br />
                        Kharar, Punjab.
                      </p>
                    </div>
                  </div>
                  <div className="classes_join_contact_row">
                    <span className="classes_join_contact_icon">📞</span>
                    <div>
                      <p className="classes_join_contact_label">Contact</p>
                      <a href="tel:+919779379004" className="classes_join_contact_phone">
                        +91 97793-79004
                      </a>
                      <p className="classes_join_contact_note">WhatsApp / Call</p>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </div>

          <p className="classes_join_motto">Learn Today, Create Tomorrow</p>
        </Container>
      </section>

      <BoutiqueFooter />
    </div>
  );
};

export default ClassesPage;
