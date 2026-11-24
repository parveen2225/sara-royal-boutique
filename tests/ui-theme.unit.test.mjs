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
    "src/components/shop/shop.scss", "src/components/shop/SuitCard.tsx", "src/components/common/footer",
    "src/lib/suitWhatsapp.ts", "src/lib/cartCore.ts", "src/lib/cartStore.ts", "src/lib/money.ts", "src/lib/shopApi.ts", "src/lib/useShop.ts",
    "src/lib/tryOn", "src/components/tryOn", "src/app/api", "src/models", "middleware.ts", "src/lib/auth", "src/app/admin", "src/lib/customerAuth",
  ].filter((p) => fs.existsSync(path.join(root, p)));
  const changed = execFileSync("git", ["status", "--porcelain", "--", ...protectedPaths], { cwd: root, encoding: "utf8" }).trim();
  assert.equal(changed, "", `protected files changed:\n${changed}`);
});
