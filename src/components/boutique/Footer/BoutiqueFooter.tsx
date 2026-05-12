import React from "react";
import Link from "next/link";
import { Container, Row, Col } from "react-bootstrap";
import { getWhatsAppUrl } from "@/utils/whatsapp";
import { BoutiqueWhatsAppIcon, BoutiqueInstagramIcon } from "@/assets/icons/svgIcon";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import "./BoutiqueFooter.scss";
import Image from "next/image";
import logo from "../../../../public/images/logo_1.png";

const FOOTER_LINKS = [
  { label: "Home", href: "/" },
  { label: "Collections", href: "/collections" },
  { label: "Classes", href: "/classes" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const INSTAGRAM_URL = "https://www.instagram.com/sararoyalboutique";
const GOOGLE_REVIEW_URL = "https://g.page/r/CW8_ymiprhnvEBM/review";

const BoutiqueFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="boutique_footer">
      <Container>
        <Row className="boutique_footer_main g-4 g-lg-5">

          <Col xs={12} md={5} lg={4}>
            <div className="footer_brand">
              <Link href="/" className="footer_logo">
                <Image src={logo} alt="logo" />
              </Link>
              <p className="footer_tagline">
                Elegance in every stitch. Premium stitched suits and boutique designs crafted for the modern woman.
              </p>
            </div>
          </Col>


          <Col xs={6} md={3} lg={2}>
            <h6 className="footer_heading">Quick Links</h6>
            <ul className="footer_links_list">
              {FOOTER_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="footer_link">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </Col>


          <Col xs={6} md={4} lg={3}>
            <h6 className="footer_heading">Connect With Us</h6>
            <div className="footer_social">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="footer_social_link instagram"
                aria-label="Follow on Instagram"
              >
                <BoutiqueInstagramIcon width={20} height={20} />
                <span>Instagram</span>
              </a>

              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="footer_social_link whatsapp"
                aria-label="Chat on WhatsApp"
              >
                <BoutiqueWhatsAppIcon width={20} height={20} />
                <span>WhatsApp</span>
              </a>

              <a
                href={GOOGLE_REVIEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="footer_social_link google_review"
                aria-label="Leave a Google Review"
              >
                <span className="footer_google_star">⭐</span>
                <span>Google Review</span>
              </a>
            </div>
          </Col>


          <Col xs={12} md={12} lg={3}>
            <div className="footer_order_cta">
              <h6 className="footer_heading">Place an Order</h6>
              <p className="footer_order_text">
                All designs are custom stitched to your measurements.
              </p>
              <CommonButton
                role="link"
                to={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="footer_order_btn"
              >
                Order via WhatsApp
              </CommonButton>
            </div>
          </Col>
        </Row>

        <div className="boutique_footer_bottom">
          <p className="footer_copyright">
            © {currentYear}{" "}
            <span className="footer_brand_name">Sara Royal Boutique</span>. All
            rights reserved.
          </p>
          <p className="footer_made_with">
            Crafted with elegance &amp; care
          </p>
        </div>
      </Container>
    </footer>
  );
};

export default BoutiqueFooter;
