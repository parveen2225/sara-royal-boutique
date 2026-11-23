// Server-side page metadata for /suits/[id]: title, description, canonical URL and Open Graph / Twitter tags built
// from the real published suit, so WhatsApp, Facebook etc. show the product photo in their link preview.
// Read-only. Draft, archived and unknown suits get generic metadata (and are not indexed): nothing leaks.
import { cache } from "react";
import type { Metadata } from "next";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import UnstitchedSuit from "@/models/UnstitchedSuit";
import { isObjectId } from "@/lib/validation";
import { formatInrPaise } from "@/lib/money";
import { productImageUrl, publicSiteUrl, suitPublicUrl } from "@/lib/siteUrl";

const BRAND = "Sara Royal Boutique";
export const OG_IMAGE_SIZE = { w: 1200, h: 630 } as const;

type MetaSuit = { _id: unknown; sku: string; name: string; description?: string; fabric?: string; color?: string; salePricePaise: number; stock: number; fabricImages?: { url: string }[] };

export const loadSuitForMetadata = cache(async (rawId: string): Promise<MetaSuit | null> => {
  let key = "";
  try { key = decodeURIComponent(rawId ?? "").trim(); } catch { return null; } // malformed %-escape
  const lookup = isObjectId(key) ? { _id: key } : /^SR-\d{4,}$/i.test(key) ? { sku: String(key).toUpperCase() } : null;
  if (!lookup || !isMongoConfigured()) return null;
  try {
    await connectMongo();
    return (await UnstitchedSuit.findOne({ ...lookup, status: "published" })
      .select("sku name description fabric color salePricePaise stock fabricImages").lean()) as MetaSuit | null;
  } catch (error) {
    console.error("[suit metadata]", error instanceof Error ? error.message : error);
    return null;
  }
});

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

export function suitDescription(s: Pick<MetaSuit, "description" | "fabric" | "color" | "salePricePaise" | "stock">): string {
  const facts = [s.fabric, s.color].map((x) => x?.trim()).filter(Boolean).join(" · ");
  const lead = `${facts ? `${facts}. ` : ""}${formatInrPaise(s.salePricePaise)}${s.stock > 0 ? "" : " (currently out of stock)"}.`;
  const body = s.description?.replace(/\s+/g, " ").trim();
  return clip(`${lead} ${body ? `${body} ` : ""}Unstitched suit from ${BRAND}. Order on WhatsApp.`, 200);
}

export const GENERIC_SUIT_METADATA: Metadata = {
  title: `Unstitched Suit — ${BRAND}`,
  description: `Unstitched ladies suit fabric from ${BRAND}. Order on WhatsApp.`,
  robots: { index: false, follow: true },
};

export function buildSuitMetadata(s: MetaSuit | null, base: string = publicSiteUrl()): Metadata {
  if (!s) return GENERIC_SUIT_METADATA;
  const url = suitPublicUrl(String(s._id), base);
  const title = `${s.name} — ${BRAND}`;
  const description = suitDescription(s);
  const image = productImageUrl(s.fabricImages?.[0]?.url, OG_IMAGE_SIZE); // real photo only; no placeholder
  const images = image ? [{ url: image, secureUrl: image, width: OG_IMAGE_SIZE.w, height: OG_IMAGE_SIZE.h, alt: `${s.name} unstitched suit fabric`, type: "image/jpeg" }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: BRAND, locale: "en_IN", url, title, description, ...(images ? { images } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) },
  };
}
