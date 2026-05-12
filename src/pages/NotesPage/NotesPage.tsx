"use client";

import React from "react";
import BoutiqueNavbar from "@/components/boutique/Header/Header";
import BoutiqueFooter from "@/components/boutique/Footer/BoutiqueFooter";

const NotesPage: React.FC = () => {
  return (
    <div className="boutique_page" style={{ minHeight: "100vh", background: "var(--boutique-bg)" }}>
      <BoutiqueNavbar />
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: "5rem",
          color: "var(--boutique-text)",
          fontFamily: "var(--font-display)",
          textAlign: "center",
          gap: "1rem",
        }}
      >
        <span style={{ fontSize: "2rem", color: "#C9A84C" }}>✦</span>
        <h2 style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>Coming Soon</h2>
        <p style={{ color: "#9B8A6E", margin: 0 }}>This section is under construction.</p>
      </div>
      <BoutiqueFooter />
    </div>
  );
};

export default NotesPage;
