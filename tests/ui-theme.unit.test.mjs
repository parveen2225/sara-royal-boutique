// Header tone, theme tokens and Cart redesign: pure logic + static guarantees (no browser). The real-browser checks
// (contrast, responsive, theme flash, WhatsApp URL) live in the manual regression suite described in the work report.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const { headerToneFor } = await import("../src/lib/headerTone.ts");
const root = path.resolve(import.meta.dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

test("header tone: Collections and About keep the legacy header; dark-hero pages are 'hero'; everything else (incl. unknown routes) is 'plain'", () => {
  for (const p of ["/collections", "/collections/x", "/about", "/About", "/about/"]) assert.equal(headerToneFor(p), undefined, p);
  for (const p of ["/", "/stitching", "/design-studio", "/design-studio/neck-designs", "/design-studio/a/b", "/gallery", "/services", "/classes", "/contact",
    "/boutique-classes-punjab", "/designer-suits-kharar", "/ladies-tailor-kharar", "/suit-stitching-kharar", "/?utm=1"]) assert.equal(headerToneFor(p), "hero", p);
  for (const p of ["/cart", "/suits/abc", "/product/1", "/login", "/signup", "/my-account", "/forgot-password", "/verify-email", "/does-not-exist", "/classesx", "/aboutus", "/collectionsx", null, undefined]) {
    const t = headerToneFor(p); assert.ok(t === "plain" || (p == null && t === "hero"), `${p} -> ${t}`);
  }
});

test("new routes can never get invisible navigation: the safe 'plain' tone is the default", () => {
  assert.equal(headerToneFor("/some-brand-new-page"), "plain");
  assert.equal(headerToneFor("/some-brand-new-page/deep/path"), "plain");
});

test("--boutique-gold-text meets WCAG AA on every surface of its theme (the brand gold does not)", () => {
  const v = read("src/assets/theme/_var.scss");
  const light = /--boutique-gold-text:\s*(#[0-9a-f]{6})/i.exec(v)?.[1]; const dark = /--boutique-gold-text:\s*(#[0-9a-f]{6});\s*\/\//i.exec(v)?.[1];
  assert.ok(light && dark && light !== dark, "defined once per theme");
  for (const surface of ["#faf7f0", "#ffffff", "#f3ead7", "#f5edd8"]) assert.ok(ratio(light, surface) >= 4.5, `light ${light} on ${surface} = ${ratio(light, surface).toFixed(2)}`);
  for (const surface of ["#080c14", "#0e1622", "#0a0f18", "#0a1220"]) assert.ok(ratio(dark, surface) >= 4.5, `dark ${dark} on ${surface}`);
  assert.ok(ratio("#c9a84c", "#faf7f0") < 3, "brand gold on ivory is the problem this token solves");
  assert.ok(ratio("#04210f", "#25d366") >= 7, "WhatsApp green button text");
  assert.ok(ratio("#a4161a", "#ffffff") >= 4.5 && ratio("#ff8b98", "#0e1622") >= 4.5, "cart danger colours on each theme");
});

test("header styles: themed rules apply only under [data-header-tone]; no global hard-coded white text; Header sets the attribute", () => {
  const scss = strip(read("src/components/common/header/Header.scss"));
  const i = scss.indexOf(".boutique_header[data-header-tone] {");
  assert.ok(i > 0, "themed block present");
  const block = scss.slice(i);
  assert.match(block, /&\[data-header-tone="plain"\]/); assert.match(block, /&\[data-header-tone="hero"\]:not\(\.scrolled\)/);
  assert.match(block, /--boutique-gold-text/);
  assert.equal((block.match(/#fff(fff)?\b/gi) ?? []).length, 1, "white appears once: the light-on-scrim hero token");
  const header = read("src/components/common/header/Header.tsx");
  assert.match(header, /data-header-tone=\{headerToneFor\(pathname\)\}/);
  assert.doesNotMatch(header, /style=\{\{[^}]*(color|background)/, "no inline theme styles in the header");
});

test("Cart redesign: all cart / WhatsApp / validation logic is still used; styling is Bootstrap + SCSS only", () => {
  const cart = read("src/pages/CartPage/CartPage.tsx");
  for (const must of ["validateCartOnServer(", "applyValidation(", "buildOrderMessage(", "buildWhatsAppUrl(", "cartStore.setQuantity(", "cartStore.remove(", "cartStore.clear()", "lineTotalPaise(", "formatInrPaise(subtotalPaise)", "hasIssues", "QuantityStepper"]) assert.ok(cart.includes(must), must);
  assert.match(cart, /window\.open\("", "_blank"\)/, "popup-safe WhatsApp tab handling kept");
  assert.match(cart, /The cart is deliberately NOT cleared/, "checkout does not clear the cart");
  for (const t of ["Order summary", "Products subtotal", "Confirmed on WhatsApp", "excl. shipping", "WhatsApp Checkout", "Continue shopping", "Cash on Delivery", "Prepaid UPI", "Nothing is ordered", "PIN code", "Clear cart"]) assert.ok(cart.includes(t), t);
  assert.doesNotMatch(cart, /style=\{\{/, "no inline style objects");
  assert.doesNotMatch(cart, /shipping.{0,20}₹\s*\d|SHIPPING_FEE|shippingPaise/i, "no invented shipping fee");
  const scss = read("src/pages/CartPage/cart.scss"); assert.doesNotMatch(scss, /@tailwind|@apply/); assert.match(cart, /import "\.\/cart\.scss"/);
  assert.equal(fs.existsSync(path.join(root, "src/pages/CartPage/cart.module.scss")), false);
  assert.doesNotMatch(read("package.json"), /tailwind/i);
  assert.match(scss, /\.theme-light \.cart_page/, "light theme overrides");
});

test("scope: restricted pages and shared files are byte-for-byte unchanged (git)", () => {
  const protectedPaths = [
    "src/pages/CollectionsPage", "src/pages/AboutPage", "src/pages/SuitCollectionsPage", "src/app/collections", "src/app/about",
    // shop.scss is intentionally absent: it was re-nested with `&` on request, with a compiled stylesheet proven identical (same rules, order, specificity)
    "src/components/shop/SuitCard.tsx", "src/components/common/ui/commonButton",
    "src/lib/suitWhatsapp.ts", "src/lib/cartCore.ts", "src/lib/cartStore.ts", "src/lib/money.ts", "src/lib/shopApi.ts", "src/lib/useShop.ts",
    "src/lib/tryOn", "src/components/tryOn", "src/app/api/admin", "src/app/api/customer", "src/app/api/try-on", "src/app/api/suits", "src/app/api/suit-cart", "src/app/api/suit-categories", "src/app/api/products", "src/app/api/settings", "src/app/api/auth/me", "src/app/api/auth/logout", "src/app/api/auth/change-password", "src/models", "middleware.ts", "src/lib/auth/guard.ts", "src/lib/auth/edgeJwt.ts", "src/lib/auth/permissions.ts", "src/app/admin", "src/lib/customerAuth",
  ].filter((p) => fs.existsSync(path.join(root, p)));
  const changed = execFileSync("git", ["status", "--porcelain", "--", ...protectedPaths], { cwd: root, encoding: "utf8" }).trim();
  assert.equal(changed, "", `protected files changed:\n${changed}`);
});

test("responsive fixes: hero labels readable in the light theme, scoped to their own pages; no rule can reach Collections / About / Stitching", () => {
  const files = {
    "src/components/boutique/DesignStudio/DesignStudio.scss": /\.theme-light \.design_studio_page \[class\*="ds_hero"\] \.section_label \{ color: var\(--boutique-gold-light\); \}/,
    "src/components/boutique/GalleryPage/GalleryPage.scss": /\.theme-light \.gallery_page \.gallery_page_hero \.section_label \{ color: var\(--boutique-gold-light\); \}/,
    "src/pages/ServicesPage/ServicesPage.scss": /\.theme-light \.services_page \.services_page_hero \.section_label \{ color: var\(--boutique-gold-light\); \}/,
    "src/components/boutique/SeoLandingPage/SeoLandingPage.scss": /\.theme-light \.seo_landing_page \.seo_page_hero \.section_label \{ color: var\(--boutique-gold-light\); \}/,
    "src/pages/ContactPage/ContactPage.scss": /\.contact_page \{ overflow-x: clip; \}/,
    "src/components/boutique/HomePageSections/CollectionsSection/CollectionsSection.scss": /@media \(max-width: 767px\) \{\s*\.section_collections \.product_card_category \{ font-size: 0\.65rem; \}/,
  };
  for (const [f, re] of Object.entries(files)) assert.match(read(f), re, f);
  // the homepage-only class is not used by the restricted Collections code, and the shared ProductCard stylesheet is untouched
  const used = execFileSync("grep", ["-rl", "section_collections", "src", "--include=*.tsx"], { cwd: root, encoding: "utf8" }).trim().split("\n");
  assert.deepEqual(used, ["src/components/boutique/HomePageSections/CollectionsSection/CollectionsSection.tsx"]);
  const changed = execFileSync("git", ["status", "--porcelain", "--", "src/components/boutique/ProductCard", "src/pages/CollectionsPage", "src/pages/AboutPage"], { cwd: root, encoding: "utf8" }).trim();
  assert.equal(changed, "", "ProductCard.scss (shared with Collections) and the restricted pages stay untouched");
  // tap targets of the auth text-buttons: padded to ~40px with a cancelling negative margin (layout unchanged)
  assert.match(read("src/components/account/account.scss"), /\.acct_inline \{\s*display: inline-block; padding: 0\.6rem 0\.4rem; margin: -0\.6rem -0\.4rem;/);
});

// ---------- responsive typography system
const clampPx = (expr, vw) => {
  const m = /clamp\(\s*([\d.]+)rem\s*,\s*([\d.]+)rem\s*\+\s*([\d.]+)vw\s*,\s*([\d.]+)rem\s*\)/.exec(expr) ?? /clamp\(\s*([\d.]+)rem\s*,\s*([\d.]+)rem\s*,\s*([\d.]+)rem\s*\)/.exec(expr);
  assert.ok(m, expr);
  if (m.length === 5) { const [, min, base, slope, max] = m.map(Number); return Math.min(max * 16, Math.max(min * 16, base * 16 + (slope / 100) * vw)); }
  return Math.min(+m[3] * 16, Math.max(+m[1] * 16, +m[2] * 16));
};

test("type scale: fluid tokens land inside the target ranges at phone / tablet / desktop widths", () => {
  const g = read("src/app/globals.scss");
  const tok = (name) => new RegExp(`--type-${name}:\\s*(clamp\\([^)]*\\))`).exec(g)?.[1];
  const targets = { hero: [[390, 30, 38], [768, 38, 48], [1440, 48, 64]], h2: [[390, 26, 30], [768, 30, 36], [1440, 36, 44]], body: [[390, 15, 16], [768, 15, 17], [1440, 16, 18]], small: [[390, 13, 14], [1440, 13, 14]], btn: [[390, 14, 16], [1440, 14, 16]] };
  for (const [name, rows] of Object.entries(targets)) { const e = tok(name); assert.ok(e, `--type-${name} defined`); for (const [vw, lo, hi] of rows) { const px = clampPx(e, vw); assert.ok(px >= lo - 0.2 && px <= hi + 0.2, `--type-${name} @${vw}px = ${px.toFixed(1)} (want ${lo}-${hi})`); } }
  assert.ok(clampPx(tok("hero"), 1920) <= 60.01, "hero never exceeds 60px, even on 4K (it used to reach 88px)");
  assert.match(g, /--type-micro:\s*0\.6875rem/, "11px floor for badges");
  const mixins = read("src/assets/theme/_typography.scss");
  for (const m of ["type-hero", "type-h2", "type-h3", "type-lead", "type-body", "type-small", "type-btn", "type-eyebrow"]) assert.match(mixins, new RegExp(`@mixin ${m}\\b`), m);
  assert.doesNotMatch(strip(mixins).replace(/@mixin[^{]*\{[^}]*\}/g, ""), /\S/, "the mixin file emits no CSS by itself");
});

test("typography applied: heroes, section headings and previously tiny labels use the tokens (no 8-10px hero text)", () => {
  const must = {
    "src/components/boutique/HeroSection/HeroSection.scss": ["font-size: var(--type-hero)", "text-wrap: balance", "var(--type-btn)", "var(--type-micro)"],
    "src/pages/HomePage/HomePage.scss": ["var(--type-h2)", "var(--type-lead)", "var(--type-eyebrow)"],
    "src/pages/ServicesPage/ServicesPage.scss": ["var(--type-hero)"], "src/components/boutique/GalleryPage/GalleryPage.scss": ["var(--type-hero)"],
    "src/components/boutique/DesignStudio/DesignStudio.scss": ["var(--type-hero)", "var(--type-h2)"], "src/pages/ClassesPage/ClassesPage.scss": ["clamp(2.25rem, 1.3rem + 3.9vw, 4rem)", "var(--type-h2)"],
    "src/pages/ContactPage/ContactPage.scss": ["var(--type-hero)", "var(--type-h2)"], "src/components/boutique/SeoLandingPage/SeoLandingPage.scss": ["var(--type-hero)"],
    "src/pages/CartPage/cart.scss": ["var(--type-h2)", "var(--type-small)"],
  };
  for (const [f, needles] of Object.entries(must)) for (const n of needles) assert.ok(read(f).includes(n), `${f} uses ${n}`);
  const hero = strip(read("src/components/boutique/HeroSection/HeroSection.scss"));
  const sizes = [...hero.matchAll(/font-size:\s*([\d.]+)rem/g)].map((m) => +m[1]);
  assert.ok(sizes.every((r) => r >= 0.7), `hero has no fixed font-size below 0.7rem (found ${sizes.filter((r) => r < 0.7)})`);
  assert.doesNotMatch(hero, /5\.5rem|6\.4vw/, "the 88px breakpoint override is gone");
});

test("homepage layout fixes: tablet hero centred, rails 2x2 on tablet and centred when short, ordering steps 3+2 centred, large-screen container", () => {
  const hero = read("src/components/boutique/HeroSection/HeroSection.scss"); assert.match(hero, /justify-self: center;\s*width: min\(100%, 500px\)/);
  const home = read("src/pages/HomePage/HomePage.scss");
  assert.match(home, /#featured-suits,\s*#new-arrivals \{\s*\.row \{ justify-content: center; \}/); assert.match(home, /\.col-md-4 \{ flex: 0 0 auto; width: 50%; \}/);
  assert.match(home, /\.home_page \{[\s\S]*max-width: 1480px[\s\S]*max-width: 1640px/);
  assert.match(read("src/pages/HomePage/HomePage.tsx"), /className="boutique_page home_page"/);
  const ord = read("src/components/boutique/HomePageSections/OrderingProcessSection/OrderingProcessSection.scss");
  assert.match(ord, /grid-template-columns: repeat\(6, minmax\(0, 1fr\)\)/); assert.match(ord, /nth-child\(4\) \{ grid-column: 2 \/ span 2; \}/); assert.match(ord, /nth-child\(5\) \{ grid-column: 4 \/ span 2; \}/);
});

test("footer overflow fix is opt-in: every page except Collections and About gets it; their footer is exactly as before", () => {
  assert.equal(headerToneFor("/collections"), undefined); assert.equal(headerToneFor("/about"), undefined);
  for (const p of ["/", "/cart", "/services", "/stitching"]) assert.notEqual(headerToneFor(p), undefined, p);
  assert.match(read("src/components/common/layout/ConditionalLayout.tsx"), /<Footer clipX=\{headerToneFor\(pathname\) !== undefined\} \/>/);
  const footer = read("src/components/common/footer/Footer.tsx");
  assert.match(footer, /\{ clipX = false \}/); assert.match(footer, /\$\{clipX \? " is_clip_x" : ""\}/);
  const diff = execFileSync("git", ["diff", "-U0", "--", "src/components/common/footer/Footer.scss"], { cwd: root, encoding: "utf8" });
  const added = diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")); const removed = diff.split("\n").filter((l) => l.startsWith("-") && !l.startsWith("---"));
  assert.equal(removed.length, 0, "no existing footer rule was modified or removed");
  assert.ok(added.some((l) => /\.boutique_footer\.is_clip_x \{ overflow-x: clip; \}/.test(l)));
});

// ---------- loader centring / phone-width regressions
test("phones: nothing may widen the page while it loads (that made the fixed loader logo sit off-centre) and the hero card stays clear", () => {
  const reels = read("src/components/boutique/HomePageSections/ReelsSection/ReelsSection.scss");
  assert.match(reels, /\.reels_skeleton_row \{[^}]*repeat\(4, minmax\(0, 1fr\)\)[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/, "skeleton tracks can shrink below the card's min width");
  assert.match(reels, /\.reel_skeleton_card \{[\s\S]*?width: 100%;[\s\S]*?min-width: 0;[\s\S]*?aspect-ratio: 9 \/ 14;/, "an aspect-ratio grid item needs an explicit width");
  assert.match(read("src/components/boutique/HomePageSections/TestimonialsSection/TestimonialsSection.scss"), /testimonials_skeleton_row \{[^}]*repeat\(3, minmax\(0, 1fr\)\)/);
  const home = read("src/pages/HomePage/HomePage.scss");
  assert.equal((home.match(/@media \(max-width: 575px\) \{\s*white-space: normal;\s*justify-content: center;/g) ?? []).length, 2, "both home button styles wrap on the smallest phones");
  assert.match(read("src/components/boutique/HomePageSections/CtaBannerSection/CtaBannerSection.scss"), /min-width: min\(280px, 100%\)/);
  const hero = read("src/components/boutique/HeroSection/HeroSection.scss");
  assert.match(hero, /@media \(max-width: 575px\) \{[\s\S]*?\.stat_label \{ display: none; \}[\s\S]*?\.bottom_badge \{ bottom: 5\.1rem;/);
  // the loader itself stays a plain fixed, flex-centred overlay (the fix is to stop the page widening, not to hack the loader)
  const loader = read("src/components/common/ui/loader/Loader.scss");
  assert.match(loader, /position: fixed;[\s\S]*?inset: 0;/); assert.match(loader, /align-items: center;\s*justify-content: center;/);
});

test("suit detail: reference photos preview in a same-page lightbox (no link out / new tab)", () => {
  const page = read("src/pages/SuitDetailPage/SuitDetailPage.tsx");
  const section = page.slice(page.indexOf('className="shop_ref"'), page.indexOf("</section>", page.indexOf('className="shop_ref"')));
  assert.doesNotMatch(section, /<a\b|target="_blank"/, "reference thumbnails are buttons, not external links");
  assert.match(section, /<button[^>]*shop_ref_thumb/);
  assert.match(section, /<SuitImageLightbox/);
  const lb = read("src/components/shop/SuitImageLightbox.tsx");
  for (const re of [/Escape/, /ArrowLeft/, /ArrowRight/, /aria-modal="true"/, /touchstart|onTouchStart/i, /overflow = "hidden"/, /createPortal/]) assert.match(lb, re, String(re));
  assert.match(read("src/components/shop/suitImageLightbox.scss"), /object-fit: contain/);
});
