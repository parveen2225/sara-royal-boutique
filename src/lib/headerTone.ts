// Which kind of surface sits behind the site header at the top of a page, so the header can pick readable colours.
//   hero  : a dark full-bleed photo hero sits behind the (transparent) header -> light text over a dark scrim, themed bar once scrolled
//   plain : an ordinary themed page background (ivory in the light theme) -> the header is a solid themed bar at all times
//   undefined : unchanged legacy header styling (Collections and About keep their original, approved appearance)
// Unknown / new routes are "plain" on purpose: a solid themed bar is readable on every page and theme, so a new page can
// never end up with invisible navigation. Add a route to HERO_PREFIXES only if it really starts with a dark photo hero.
export type HeaderTone = "hero" | "plain";

const UNCHANGED = /^\/(collections|about)(\/|$)/i;
const HERO_PREFIXES = [
  "/stitching", "/design-studio", "/gallery", "/services", "/classes", "/contact",
  "/boutique-classes-punjab", "/designer-suits-kharar", "/ladies-tailor-kharar", "/suit-stitching-kharar",
];

/**
 * Should the footer clip its row's ~8px horizontal overflow (992-1599px)? Every page except About (left exactly as it was);
 * Collections opted in with its gallery update.
 */
export const footerClipsX = (pathname: string | null | undefined) =>
  headerToneFor(pathname) !== undefined || /^\/collections(\/|$)/i.test((pathname ?? "/").split(/[?#]/)[0]);

export function headerToneFor(pathname: string | null | undefined): HeaderTone | undefined {
  const p = (pathname ?? "/").split(/[?#]/)[0] || "/";
  if (UNCHANGED.test(p)) return undefined;
  if (p === "/" || HERO_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`))) return "hero";
  return "plain";
}
