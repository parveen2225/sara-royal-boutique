import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import 'bootstrap/dist/css/bootstrap.min.css';
import "./globals.scss";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import Script from "next/script";
import { getThemeInitScript } from "@/lib/theme/themeInit";
import Loader from "@/components/common/ui/loader/Loader";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plusJakartaDisplay = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sara Royal Boutique — Elegance in Every Stitch",
  description:
    "Premium stitched suits & boutique designs crafted for the modern woman. Custom stitching, quality fabrics, and timeless elegance.",
  keywords: "boutique, stitched suits, women fashion, Sara Royal, Pakistani fashion",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${plusJakartaDisplay.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: getThemeInitScript() }}
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <Loader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
