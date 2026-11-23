import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Lets a second, isolated dev/test server use its own build directory (NEXT_DIST_DIR=.next-ui) next to the main one.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // pdfkit reads its font files from disk and exceljs is large: keep both out of the server bundle.
  serverExternalPackages: ["pdfkit", "exceljs"],
  // The invoice PDF embeds Noto fonts read from disk at runtime: make sure serverless bundles include them.
  outputFileTracingIncludes: { "/api/admin/orders/[id]/invoice": ["./assets/fonts/**/*"] },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
