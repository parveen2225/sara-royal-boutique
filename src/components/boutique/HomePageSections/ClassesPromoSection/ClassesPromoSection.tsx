"use client";

import React from "react";
import { Container } from "react-bootstrap";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import "./ClassesPromoSection.scss";

const ClassesPromoSection: React.FC = () => {
  return (
    <section className="classes_promo_section">
      <Container>
        <div className="classes_promo_inner">
          <div className="classes_promo_text">
            <span className="classes_promo_eyebrow">✦ New at Sara Royal</span>
            <h2 className="classes_promo_title">
              Sewing <em>Classes</em>
            </h2>
            <div className="classes_promo_tags">
              <span>LEARN</span>
              <span className="sep">|</span>
              <span>STITCH</span>
              <span className="sep">|</span>
              <span>GROW</span>
            </div>
            <ul className="classes_promo_list">
              <li>✦ Stitching — Basic to Advanced</li>
              <li>✦ Measurement &amp; Fitting</li>
              <li>✦ Designing &amp; Finishing</li>
              <li>✦ Certificate Provided</li>
            </ul>
            <div className="classes_promo_fee">
              <span className="fee_text">Only</span>
              <span className="fee_amount">₹1,500/-</span>
              <span className="fee_text">per person</span>
            </div>
            <div>
              <CommonButton role="link" to="/classes" className="boutique_gold_btn classes_promo_btn">
                Join Our Classes →
              </CommonButton>
            </div>
          </div>
          <div className="classes_promo_badge_wrap">
            <div className="classes_promo_badge">
              <span className="badge_line1">LEARN TODAY</span>
              <span className="badge_line2">CREATE TOMORROW</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default ClassesPromoSection;
