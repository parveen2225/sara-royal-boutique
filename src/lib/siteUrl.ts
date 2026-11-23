// Public, customer-facing URLs (used in WhatsApp messages, Open Graph tags and the Share button).
// Always the live HTTPS site, never the address the page happens to be served from (localhost links in a
// customer's WhatsApp message would be useless to the boutique). Pure: safe on the server and in the browser.

export const DEFAULT_PUBLIC_SITE_URL = "https://sararoyalboutique.com";

/** NEXT_PUBLIC_SITE_URL when it is a clean https origin, else the live domain. */
export function publicSiteUrl(raw: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_PUBLIC_SITE_URL;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password || u.search || u.hash) return DEFAULT_PUBLIC_SITE_URL;
    return `${u.origin}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return DEFAULT_PUBLIC_SITE_URL;
  }
}

/** Canonical public product page for an unstitched suit. */
export function suitPublicUrl(id: string, base: string = publicSiteUrl()): string {
  return `${base}/suits/${encodeURIComponent(id)}`;
}

const isHttps = (url: unknown): url is string => {
  if (typeof url !== "string" || url.length > 2048) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
};

/**
 * Real product photo sized for link previews / sharing. Cloudinary images get a delivery transformation
 * (crop to the size, JPEG, auto quality: ~150 KB at 1200x630, well inside WhatsApp's preview limits).
 * Other HTTPS images are returned unchanged. Anything that is not HTTPS returns null: there is no placeholder.
 */
export function productImageUrl(src: unknown, size: { w: number; h: number } = { w: 1200, h: 630 }): string | null {
  if (!isHttps(src)) return null;
  const u = new URL(src);
  const marker = "/image/upload/";
  if (u.hostname !== "res.cloudinary.com" || !u.pathname.includes(marker)) return src;
  const t = `c_fill,g_auto,w_${size.w},h_${size.h},q_auto:good,f_jpg`;
  u.pathname = u.pathname.replace(marker, `${marker}${t}/`);
  return u.toString();
}
