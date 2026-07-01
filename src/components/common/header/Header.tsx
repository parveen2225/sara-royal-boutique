"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "react-bootstrap";
import { getWhatsAppUrl } from "@/utils/whatsapp";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  BoutiqueWhatsAppIcon,
  BoutiqueInstagramIcon,
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
  const menuPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close menu on outside click (clicks on backdrop or outside panel)
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        menuPanelRef.current &&
        !menuPanelRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [menuOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      {/* ── Main header bar ─────────────────────────────────────────── */}
      <header className={`boutique_header ${scrolled ? "scrolled" : ""}`}>
        {/* Top hiring banner */}
        <div className="header_top_banner">
          <Link href="/#hiring" className="banner_link">
            <span className="blink_text">✦ WE ARE HIRING! ✦</span>
            <span className="banner_sub">Female Staff Required - Apply Now</span>
          </Link>
        </div>

        {/* Main row: logo | desktop nav | actions */}
        <Container className="boutique_header_inner">
          <Link href="/" className="boutique_header_brand">
            <Image
              src={logo}
              alt="Sara Royal Boutique Logo"
              className="d-none d-lg-block"
              priority
            />
            <Image
              src={logoIcon}
              alt="Sara Royal Boutique"
              className="d-block d-lg-none"
              priority
            />
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
              svgIcon={
                <BoutiqueWhatsAppIcon
                  width={17}
                  height={17}
                  style={{ flexShrink: 0 }}
                />
              }
            >
              <span className="btn_label">Order Now</span>
            </CommonButton>

            <CommonButton
              className="theme_toggle_btn"
              onClick={toggleTheme}
              ariaLabel={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            >
              <span aria-hidden="true">
                {theme === "light" ? <LightThemeIcon /> : <DarkThemeIcon />}
              </span>
            </CommonButton>

            <CommonButton
              className={`boutique_hamburger ${menuOpen ? "is-open" : ""}`}
              onClick={() => setMenuOpen((prev) => !prev)}
              ariaLabel={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              ariaExpanded={menuOpen}
              ariaControls="boutique-mobile-menu"
            >
              <span className="h_bar" />
              <span className="h_bar" />
              <span className="h_bar" />
            </CommonButton>
          </div>
        </Container>
      </header>

      {/* ── Mobile menu (fixed, left-side panel) ────────────────────── */}
      {/* Backdrop — rendered when menu is open */}
      <div
        className={`mobile_menu_backdrop ${menuOpen ? "is-visible" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-in panel from the left */}
      <div
        ref={menuPanelRef}
        id="boutique-mobile-menu"
        className={`boutique_mobile_menu ${menuOpen ? "is-open" : ""}`}
        aria-hidden={!menuOpen}
        role="dialog"
        aria-label="Mobile navigation"
      >
        {/* Panel header */}
        <div className="mobile_menu_header">
          <Link
            href="/"
            className="mobile_menu_brand"
            onClick={() => setMenuOpen(false)}
          >
            <span className="brand_icon" aria-hidden="true">
              ✦
            </span>
            <span className="brand_text">Sara Royal</span>
          </Link>
          <button
            className="mobile_menu_close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Nav links */}
        <nav className="mobile_menu_nav" aria-label="Mobile navigation links">
          {NAV_LINKS.map(({ label, href }, i) => (
            <Link
              key={href}
              href={href}
              className={`mobile_nav_link ${pathname === href ? "active" : ""}`}
              onClick={() => setMenuOpen(false)}
              style={{
                animationDelay: menuOpen ? `${i * 45}ms` : "0ms",
              }}
            >
              <span className="link_label">{label}</span>
              <BoutiqueArrowRightIcon
                width={15}
                height={15}
                className="link_arrow"
                aria-hidden="true"
              />
            </Link>
          ))}
        </nav>

        {/* Footer section */}
        <div className="mobile_menu_footer">
          <CommonButton
            role="link"
            to={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="mobile_menu_cta"
            onClick={() => setMenuOpen(false)}
            svgIcon={
              <BoutiqueWhatsAppIcon
                width={17}
                height={17}
                style={{ flexShrink: 0 }}
              />
            }
          >
            Order on WhatsApp
          </CommonButton>

          <div className="mobile_menu_social">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mobile_social_link"
              onClick={() => setMenuOpen(false)}
            >
              <BoutiqueInstagramIcon
                width={16}
                height={16}
                style={{ flexShrink: 0 }}
              />
              <span>Instagram</span>
            </a>
            <span className="mobile_social_sep" aria-hidden="true">
              ✦
            </span>
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mobile_social_link"
              onClick={() => setMenuOpen(false)}
            >
              <BoutiqueWhatsAppIcon
                width={16}
                height={16}
                style={{ flexShrink: 0 }}
              />
              <span>WhatsApp</span>
            </a>
          </div>

          <p className="mobile_menu_tagline">Elegance in Every Stitch</p>
        </div>
      </div>
    </>
  );
};

export default Header;
