"use client";

import React, { useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import "./MeasurementsGuideSection.scss";

const MEASUREMENTS = [
  {
    id: "neck",
    label: "Neck",
    tip: "Measure around the base of the neck, keeping the tape snug but comfortable.",
  },
  {
    id: "chest",
    label: "Chest",
    tip: "Measure around the fullest part of the bust, parallel to the floor.",
  },
  {
    id: "waist",
    label: "Waist",
    tip: "Measure at the natural waistline — the narrowest part above the navel.",
  },
  {
    id: "hip",
    label: "Hip",
    tip: "Measure around the fullest part of the hips, 7–9 inches below the waist.",
  },
  {
    id: "sleeve",
    label: "Sleeve",
    tip: "From shoulder edge to desired sleeve length with arm slightly bent.",
  },
  {
    id: "length",
    label: "Length",
    tip: "From shoulder to desired hem for kurti, suit, or gown.",
  },
] as const;

const MeasurementDiagram: React.FC<{ id: string; active: boolean }> = ({ id, active }) => (
  <svg className={`measure_diagram_svg ${active ? "is_active" : ""}`} viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="1" opacity="0.2" fill="none" />
    {id === "neck" && (
      <ellipse cx="50" cy="38" rx="22" ry="10" stroke="var(--gold)" strokeWidth="2.5" fill="none" />
    )}
    {id === "chest" && <path d="M12 50h76" stroke="var(--gold)" strokeWidth="2.5" />}
    {id === "waist" && <path d="M18 54h64" stroke="var(--gold)" strokeWidth="2.5" />}
    {id === "hip" && <path d="M14 62h72" stroke="var(--gold)" strokeWidth="2.5" />}
    {id === "sleeve" && (
      <path d="M28 28v44" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" />
    )}
    {id === "length" && (
      <>
        <path d="M50 18v64" stroke="var(--gold)" strokeWidth="2.5" />
        <path d="M42 18h16M42 82h16" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      </>
    )}
    <path
      d="M50 22v56M38 36h24M34 58h32"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.25"
      strokeLinecap="round"
    />
  </svg>
);

const BodySilhouette: React.FC = () => (
  <svg className="measure_silhouette" viewBox="0 0 140 220" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="silhouetteGold" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgba(201,168,76,0.5)" />
        <stop offset="100%" stopColor="rgba(201,168,76,0.08)" />
      </linearGradient>
    </defs>
    <ellipse cx="70" cy="28" rx="22" ry="24" stroke="url(#silhouetteGold)" strokeWidth="1.5" />
    <path
      d="M70 52v130M42 72h56M36 118h68M40 182h60"
      stroke="url(#silhouetteGold)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path d="M42 72l-16 62M98 72l16 62" stroke="url(#silhouetteGold)" strokeWidth="1.5" opacity="0.6" />
    <path d="M40 182l-10 32M100 182l10 32" stroke="url(#silhouetteGold)" strokeWidth="1.5" opacity="0.6" />
  </svg>
);

const MeasurementsGuideSection: React.FC = () => {
  const [activeId, setActiveId] = useState<string>("chest");
  const active = MEASUREMENTS.find((m) => m.id === activeId) ?? MEASUREMENTS[1];

  return (
    <section className="measurements_guide_section py-section" id="measurements">
      <div className="measurements_guide_ambient" aria-hidden="true" />
      <Container>
        <Row className="g-5 align-items-stretch">
          <Col lg={5}>
            <div className="measurements_hero_panel">
              <span className="section_label">Fitting Guide</span>
              <h2 className="section_title">How to Measure</h2>
              <p className="measurements_intro">
                Accurate measurements ensure a perfect custom fit. Stand relaxed with a soft
                tape, then share these six readings on WhatsApp.
              </p>
              <div className="measurements_silhouette_wrap">
                <BodySilhouette />
                <MeasurementDiagram id={activeId} active />
              </div>
              <div className="measurements_active_tip">
                <span className="measurements_active_label">{active.label}</span>
                <p>{active.tip}</p>
              </div>
            </div>
          </Col>
          <Col lg={7}>
            <div className="measurements_grid">
              {MEASUREMENTS.map((field, index) => (
                <button
                  key={field.id}
                  type="button"
                  className={`measurement_luxury_card ${activeId === field.id ? "is_active" : ""}`}
                  onClick={() => setActiveId(field.id)}
                  aria-pressed={activeId === field.id}
                >
                  <span className="measurement_luxury_index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <MeasurementDiagram id={field.id} active={activeId === field.id} />
                  <h3 className="measurement_luxury_label">{field.label}</h3>
                  <p className="measurement_luxury_tip">{field.tip}</p>
                </button>
              ))}
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default MeasurementsGuideSection;
