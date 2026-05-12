import React from "react";
import { Col, Container, Row } from "react-bootstrap";
import BoutiqueNavbar from "@/components/boutique/Header/Header";
import BoutiqueFooter from "@/components/boutique/Footer/BoutiqueFooter";
import { getWhatsAppUrl } from "@/utils/whatsapp";
import {
  BoutiqueWhatsAppIcon,
  BoutiqueInstagramIcon,
  BoutiqueLocationPinIcon,
  BoutiqueArrowRightIcon,
} from "@/assets/icons/svgIcon";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import "./ContactPage.scss";

const GOOGLE_MAPS_PLACE =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4161.09140128659!2d76.61080278763056!3d30.749810709022263!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390ffb00268bbd85%3A0xef19aea968ca3f6f!2sSara%20Royal%20Boutique!5e1!3m2!1sen!2sus!4v1777976835317!5m2!1sen!2sus";
const GOOGLE_REVIEW_URL = "https://g.page/r/CW8_ymiprhnvEBM/review";

const CONTACT_ITEMS = [
  {
    icon: <BoutiqueWhatsAppIcon width={24} height={24} />,
    label: "WhatsApp",
    value: "Chat with us",
    href: getWhatsAppUrl(),
    external: true,
  },
  {
    icon: <BoutiqueInstagramIcon width={24} height={24} />,
    label: "Instagram",
    value: "@sararoyalboutique",
    href: "https://www.instagram.com/sararoyalboutique",
    external: true,
  },
  {
    icon: <span style={{ fontSize: "1.4rem", lineHeight: 1 }}>⭐</span>,
    label: "Google Review",
    value: "Leave us a 5-star review",
    href: GOOGLE_REVIEW_URL,
    external: true,
  },
  {
    icon: <BoutiqueLocationPinIcon width={24} height={24} />,
    label: "Location",
    value: "Sara Royal Boutique, H 270, Mata Gujri Ave, Kharar, Punjab, India, 140301",
    href: "https://maps.google.com/?q=Sara+Royal+Boutique,+Mata+Gujri+Ave,+Kharar,+Punjab+140301,+India",
    external: true,
  },
];

const ContactPage: React.FC = () => {
  return (
    <div className="boutique_page contact_page">
      <BoutiqueNavbar />
      <section className="contact_hero">
        <div className="contact_hero_overlay" />
        <div className="contact_hero_content">
          <span className="contact_hero_label">Get in Touch</span>
          <h1 className="contact_hero_title">Contact Us</h1>
          <p className="contact_hero_sub">
            We&apos;d love to hear from you — place an order, ask a question,
            or simply say hello.
          </p>
        </div>
      </section>
      <section className="contact_body py-section-contact">
        <Container>
          <Row className="g-5 g-lg-6">

            <Col xs={12} lg={5}>
              <div className="contact_info_col">
                <span className="contact_section_label">Reach Us</span>
                <h2 className="contact_section_title">Connect Directly</h2>
                <p className="contact_intro">
                  Visit us at our boutique or reach out via WhatsApp. We
                  typically respond within a few hours.
                </p>


                <div className="contact_address_block">
                  <p className="contact_address_line">
                    <strong>Sara Royal Boutique</strong>
                  </p>
                  <p className="contact_address_line">
                    H 270, Mata Gujri Ave, near S.K.R.M Collage
                  </p>
                  <p className="contact_address_line">
                    S.A, S Nagar, Kharar, Punjab 140301
                  </p>
                  <div className="contact_rating">
                    <span className="rating_stars">★★★★★</span>
                    <span className="rating_text">5.0</span>
                  </div>
                </div>

                <div className="contact_cards">
                  {CONTACT_ITEMS.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                      className="contact_card"
                    >
                      <span className="contact_card_icon">{item.icon}</span>
                      <div className="contact_card_text">
                        <span className="contact_card_label">{item.label}</span>
                        <span className="contact_card_value">{item.value}</span>
                      </div>
                      <BoutiqueArrowRightIcon width={16} height={16} className="contact_card_arrow" />
                    </a>
                  ))}
                </div>

                <div className="contact_order_cta">
                  <CommonButton
                    role="link"
                    to={getWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact_order_btn"
                    svgIcon={<BoutiqueWhatsAppIcon width={18} height={18} />}
                  >
                    Start a Conversation
                  </CommonButton>
                </div>
              </div>
            </Col>

            <Col xs={12} lg={7}>
              <div className="contact_map_col">
                <div className="contact_map_wrap">
                  <iframe
                    src={GOOGLE_MAPS_PLACE}
                    width="100%"
                    height="380"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Sara Royal Boutique — H 270, Mata Gujri Ave, Kharar, Punjab"
                    className="contact_map_iframe"
                  />
                </div>


                <div className="contact_hours_card">
                  <h5 className="hours_title">Business Hours</h5>
                  <ul className="hours_list">
                    <li>
                      <span>Monday – Saturday</span>
                      <span>9 AM – 9 PM</span>
                    </li>
                    <li>
                      <span>Sunday</span>
                      <span>11 AM – 7 PM</span>
                    </li>
                    <li className="hours_note">
                      <span>WhatsApp orders accepted 24/7</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      <BoutiqueFooter />
    </div>
  );
};

export default ContactPage;
