"use client";

import React from "react";
import { Container } from "react-bootstrap";
import "./OrderingProcessSection.scss";

const STEPS = [
  {
    step: "01",
    title: "Choose Design",
    description: "Share inspiration photos or your preferred style.",
    icon: "✦",
  },
  {
    step: "02",
    title: "Measurements",
    description: "WhatsApp measurements or in-boutique fitting in Kharar.",
    icon: "◎",
  },
  {
    step: "03",
    title: "Fabric",
    description: "Confirm fabric, colour, lining & embellishments.",
    icon: "❖",
  },
  {
    step: "04",
    title: "Stitching",
    description: "Expert tailors craft with precision boutique finishing.",
    icon: "◈",
  },
  {
    step: "05",
    title: "Delivery",
    description: "Final fitting check, then pickup or delivery.",
    icon: "✧",
  },
];

const OrderingProcessSection: React.FC = () => {
  return (
    <section className="ordering_process_section" id="how-it-works">
      <div className="ordering_process_bg_pattern" aria-hidden="true" />
      <Container className="ordering_process_container">
        <div className="ordering_process_header text-center">
          <span className="section_label">Boutique Journey</span>
          <h2 className="section_title">How Ordering Works</h2>
          <p className="section_sub mx-auto">
            Five simple steps — from design to your finished outfit.
          </p>
        </div>

        <div className="ordering_steps_rail" role="list" aria-label="Ordering steps">
          {STEPS.map((item) => (
            <article key={item.step} className="ordering_step_chip" role="listitem">
              <div className="ordering_step_badge">
                <span className="ordering_step_icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="ordering_step_num">{item.step}</span>
              </div>
              <h3 className="ordering_step_title">{item.title}</h3>
              <p className="ordering_step_desc">{item.description}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default OrderingProcessSection;
