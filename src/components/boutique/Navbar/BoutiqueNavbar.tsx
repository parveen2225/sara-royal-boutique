"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container, Offcanvas } from "react-bootstrap";
import { getWhatsAppUrl } from "@/utils/whatsapp";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  BoutiqueWhatsAppIcon,
  BoutiqueInstagramIcon,
  BoutiqueCloseIcon,
  BoutiqueArrowRightIcon,
} from "@/assets/icons/svgIcon";
import "./BoutiqueNavbar.scss";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Collections", href: "/collections" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const INSTAGRAM_URL = "https://www.instagram.com/sararoyalboutique";

const BoutiqueNavbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <>
      
      <header className={`boutique_nav ${scrolled ? "scrolled" : ""}`}>
        <Container className="boutique_nav_inner">
          
          <Link href="/" className="boutique_nav_brand">
            <span className="brand_icon" aria-hidden="true">✦</span>
            <span className="brand_text">Sara Royal Boutique</span>
          </Link>

          
          <nav className="boutique_nav_desktop" aria-label="Main navigation">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={`boutique_nav_link ${pathname === href ? "active" : ""}`}
              >
                {label}
              </Link>
            ))}
          </nav>

          
          <div className="boutique_nav_actions">
            <CommonButton
              role="link"
              to={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="nav_whatsapp_btn"
              ariaLabel="Order on WhatsApp"
              svgIcon={<BoutiqueWhatsAppIcon width={17} height={17} style={{ flexShrink: 0 }} />}
            >
              <span>Order Now</span>
            </CommonButton>

            
            <CommonButton
              className="theme_toggle_btn"
              onClick={toggleTheme}
              ariaLabel={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            >
              <span aria-hidden="true">{theme === "light" ? "☾" : "☼"}</span>
            </CommonButton>

            <CommonButton
              className={`boutique_hamburger ${menuOpen ? "is-open" : ""}`}
              onClick={() => setMenuOpen(true)}
              ariaLabel="Open navigation menu"
              ariaExpanded={menuOpen}
              ariaControls="boutique-offcanvas"
            >
              <span className="h_bar" />
              <span className="h_bar" />
              <span className="h_bar" />
            </CommonButton>
          </div>
        </Container>
      </header>

      
      <Offcanvas
        show={menuOpen}
        onHide={() => setMenuOpen(false)}
        placement="end"
        className="boutique_offcanvas"
        id="boutique-offcanvas"
        aria-label="Mobile navigation"
        scroll={false}
        backdrop
      >
        
        <Offcanvas.Header className="boutique_offcanvas_header">
          <Link
            href="/"
            className="offcanvas_brand"
            onClick={() => setMenuOpen(false)}
          >
            <span className="brand_icon" aria-hidden="true">✦</span>
            <span className="brand_text">Sara Royal</span>
          </Link>

          <CommonButton
            className="offcanvas_close_btn"
            onClick={() => setMenuOpen(false)}
            ariaLabel="Close navigation menu"
          >
            <BoutiqueCloseIcon width={18} height={18} />
          </CommonButton>
        </Offcanvas.Header>

        <Offcanvas.Body className="boutique_offcanvas_body">
          
          <nav className="offcanvas_nav" aria-label="Mobile navigation links">
            {NAV_LINKS.map(({ label, href }, i) => (
              <Link
                key={href}
                href={href}
                className={`offcanvas_nav_link ${pathname === href ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="link_label">{label}</span>
                <BoutiqueArrowRightIcon width={16} height={16} className="link_arrow" />
              </Link>
            ))}
          </nav>

          
          <div className="offcanvas_footer">
            
            <CommonButton
              role="link"
              to={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="offcanvas_cta_btn"
              onClick={() => setMenuOpen(false)}
              svgIcon={<BoutiqueWhatsAppIcon width={17} height={17} style={{ flexShrink: 0 }} />}
            >
              Order on WhatsApp
            </CommonButton>

            
            <div className="offcanvas_social_row">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="offcanvas_social_link"
                onClick={() => setMenuOpen(false)}
              >
                <BoutiqueInstagramIcon width={17} height={17} style={{ flexShrink: 0 }} />
                <span>Instagram</span>
              </a>
              <span className="offcanvas_social_sep" aria-hidden="true">✦</span>
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="offcanvas_social_link"
                onClick={() => setMenuOpen(false)}
              >
                <BoutiqueWhatsAppIcon width={17} height={17} style={{ flexShrink: 0 }} />
                <span>WhatsApp</span>
              </a>
            </div>

            <p className="offcanvas_tagline">Elegance in Every Stitch</p>
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default BoutiqueNavbar;
