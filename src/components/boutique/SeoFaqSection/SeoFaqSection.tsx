"use client";

import React, { useState } from "react";
import { Container } from "react-bootstrap";
import "./SeoFaqSection.scss";

export type FaqItem = {
  question: string;
  answer: string;
};

type SeoFaqSectionProps = {
  items: FaqItem[];
  title?: string;
};

const SeoFaqSection: React.FC<SeoFaqSectionProps> = ({
  items,
  title = "Frequently Asked Questions",
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="seo_faq_section py-section">
      <Container>
        <div className="seo_faq_header text-center mb-5">
          <span className="section_label">FAQ</span>
          <h2 className="section_title">{title}</h2>
        </div>
        <div className="seo_faq_list">
          {items.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <article
                key={item.question}
                className={`seo_faq_item ${isOpen ? "is_open" : ""}`}
              >
                <button
                  type="button"
                  className="seo_faq_question"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span>{item.question}</span>
                  <span className="seo_faq_icon" aria-hidden="true">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen && <p className="seo_faq_answer">{item.answer}</p>}
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
};

export default SeoFaqSection;
