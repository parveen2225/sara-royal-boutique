"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/common/header/Header";
import Footer from "@/components/common/footer/Footer";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

/**
 * Renders the common Header and Footer for all public routes.
 * Admin routes (/admin/*) are excluded — they have their own layout.
 */
const ConditionalLayout: React.FC<ConditionalLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <>
      {!isAdmin && <Header />}
      {children}
      {!isAdmin && <Footer />}
    </>
  );
};

export default ConditionalLayout;
