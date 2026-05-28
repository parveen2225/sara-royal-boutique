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
  LightThemeIcon,
  DarkThemeIcon,
} from "@/assets/icons/svgIcon";
import "./Header.scss";
import Image from "next/image";
import logo from "../../../../public/images/logo_3.png";
import logoIcon from "../../../../public/images/logo_icon.png";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Collections", href: "/collections" },
  { label: "Design Studio", href: "/design-studio" },
  { label: "Gallery", href: "/gallery" },
  { label: "Services", href: "/services" },
  { label: "Classes", href: "/classes" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const INSTAGRAM_URL = "https://www.instagram.com/sararoyalboutique";

const Header: React.FC = () => {
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
      <header className={`boutique_header ${scrolled ? "scrolled" : ""}`}>
        <div className="header_top_banner">
          <Link href="/#hiring" className="banner_link">
            <span className="blink_text">✦ WE ARE HIRING! ✦</span>
            <span className="banner_sub">Female Staff Required - Apply Now</span>
          </Link>
        </div>
        <Container className="boutique_header_inner">

          <Link href="/" className="boutique_header_brand">
            <Image src={logo} alt="Logo" className="d-none d-lg-block " />
            <Image src={logoIcon} alt="Logo" className="d-block d-lg-none " />
          </Link>

          <nav className="boutique_header_desktop" aria-label="Main navigation">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={`header_nav_link ${pathname === href ? "active" : ""}`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="boutique_header_actions">
            <CommonButton
              role="link"
              to={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="header_whatsapp_btn"
              ariaLabel="Order on WhatsApp"
              svgIcon={<BoutiqueWhatsAppIcon width={17} height={17} style={{ flexShrink: 0 }} />}
            >
              <span className="btn_label">Order Now</span>
            </CommonButton>

            <CommonButton
              className="theme_toggle_btn"
              onClick={toggleTheme}
              ariaLabel={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            >
              <span aria-hidden="true">{theme === "light" ? <LightThemeIcon /> : <DarkThemeIcon />}</span>
            </CommonButton>

            <CommonButton
              className={`boutique_hamburger ${menuOpen ? "is-open" : ""}`}
              onClick={() => setMenuOpen(true)}
              ariaLabel="Open navigation menu"
              ariaExpanded={menuOpen}
              ariaControls="boutique-drawer"
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
        className="boutique_drawer"
        id="boutique-drawer"
        aria-label="Mobile navigation"
        scroll={false}
        backdrop
      >
        <Offcanvas.Header className="boutique_drawer_header">
          <Link href="/" className="drawer_brand" onClick={() => setMenuOpen(false)}>
            <span className="brand_icon" aria-hidden="true">✦</span>
            <span className="brand_text">Sara Royal</span>
          </Link>
          <CommonButton
            className="drawer_close"
            onClick={() => setMenuOpen(false)}
            ariaLabel="Close menu"
          >
            <BoutiqueCloseIcon width={18} height={18} />
          </CommonButton>
        </Offcanvas.Header>

        <Offcanvas.Body className="boutique_drawer_body">
          <nav className="drawer_nav" aria-label="Mobile navigation">
            {NAV_LINKS.map(({ label, href }, i) => (
              <Link
                key={href}
                href={href}
                className={`drawer_nav_link ${pathname === href ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
                style={{ animationDelay: `${i * 55}ms` }}
              >
                <span className="link_label">{label}</span>
                <BoutiqueArrowRightIcon width={16} height={16} className="link_arrow" />
              </Link>
            ))}
          </nav>


          <div className="drawer_footer">
            <CommonButton
              role="link"
              to={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="drawer_cta"
              onClick={() => setMenuOpen(false)}
              svgIcon={<BoutiqueWhatsAppIcon width={17} height={17} style={{ flexShrink: 0 }} />}
            >
              Order on WhatsApp
            </CommonButton>

            <div className="drawer_social">
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
                className="drawer_social_link" onClick={() => setMenuOpen(false)}>
                <BoutiqueInstagramIcon width={17} height={17} style={{ flexShrink: 0 }} />
                <span>Instagram</span>
              </a>
              <span className="drawer_social_sep" aria-hidden="true">✦</span>
              <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer"
                className="drawer_social_link" onClick={() => setMenuOpen(false)}>
                <BoutiqueWhatsAppIcon width={17} height={17} style={{ flexShrink: 0 }} />
                <span>WhatsApp</span>
              </a>
            </div>

            <p className="drawer_tagline">Elegance in Every Stitch</p>
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default Header;
