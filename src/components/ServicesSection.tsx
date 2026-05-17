"use client";

import React from "react";
import Image from "next/image";
import { Col, Container, Row } from "react-bootstrap";
import { getWhatsAppUrl } from "@/utils/whatsapp";
import { BoutiqueWhatsAppIcon, BoutiqueArrowRightIcon } from "@/assets/icons/svgIcon";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { usePublicServices } from "@/hooks/usePublicServices";
import "./ServicesSection.scss";
import ChooseImage from "../../public/images/Mohey_Floral_Embroidered_Anarkali_Suit_4.png";

type ServicesSectionProps = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  showPageLink?: boolean;
  className?: string;
};

const ServicesSection: React.FC<ServicesSectionProps> = ({
  eyebrow = "Our Services",
  title = "Boutique Stitching Services",
  subtitle = "From daily wear to occasion-ready designer outfits, every piece is measured, cut, and finished with refined attention to fit.",
  showPageLink = true,
  className = "",
}) => {
  const services = usePublicServices();

  return (
    <section className={`services_section ${className}`} id="services">
      <Container>
        <div className="section_header text-center services_header">
          <span className="section_label">{eyebrow}</span>
          <h2 className="section_title">{title}</h2>
          <p className="section_sub">{subtitle}</p>
        </div>

        <div className="services_showcase">
          <div className="services_showcase_visual">
            <Image
              src={ChooseImage}
              alt="Sara Royal Boutique custom ladies suit"
              fill
              sizes="(max-width: 991px) 92vw, 42vw"
              className="services_showcase_img"
            />
            <div className="services_showcase_badge">
              <span>Perfect Fitting</span>
              <strong>Premium Finish</strong>
            </div>
          </div>

          <div className="services_showcase_copy">
            <span className="showcase_kicker">Custom stitching studio</span>
            <h3>Choose a service, share your design, and we shape it beautifully.</h3>
            <p>
              Sara Royal Boutique handles daily wear, occasion wear, designer outfits,
              alterations, and stitching classes with the same focus: clean fitting,
              graceful fall, and a polished finish.
            </p>
            <div className="showcase_points" aria-label="Service highlights">
              <span>Latest Designs</span>
              <span>Quality Stitching</span>
              <span>Customer Satisfaction</span>
            </div>
          </div>
        </div>

        <Row className="services_grid g-3 g-md-4">
          {services.map((service) => (
            <Col key={service.id} xs={6} md={4} xl={3}>
              <article className="service_card">
                <div className="service_card_media">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    sizes="(max-width: 575px) 50vw, (max-width: 1199px) 33vw, 25vw"
                    className="service_card_img"
                  />
                  <div className="service_icon" aria-hidden="true">
                    {service.icon}
                  </div>
                </div>
                <div className="service_card_body">
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </div>
              </article>
            </Col>
          ))}
        </Row>

        <div className="services_cta">
          <p>Need custom stitching? Order now on WhatsApp</p>
          <div className="services_cta_actions">
            <CommonButton
              role="link"
              to={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="boutique_gold_btn"
              svgIcon={<BoutiqueWhatsAppIcon width={18} height={18} />}
            >
              Order on WhatsApp
            </CommonButton>
            {showPageLink && (
              <CommonButton role="link" to="/services" className="boutique_outline_btn">
                View All Services
                <BoutiqueArrowRightIcon width={16} height={16} />
              </CommonButton>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default ServicesSection;

