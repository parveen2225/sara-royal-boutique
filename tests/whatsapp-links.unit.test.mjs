// WhatsApp checkout links + per-product Open Graph metadata + the optional Share button.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildOrderMessage, buildWhatsAppUrl } from "../src/lib/suitWhatsapp.ts";
import { DEFAULT_PUBLIC_SITE_URL, productImageUrl, publicSiteUrl, suitPublicUrl } from "../src/lib/siteUrl.ts";
import { buildSuitMetadata, suitDescription, GENERIC_SUIT_METADATA, OG_IMAGE_SIZE } from "../src/lib/suitMetadata.ts";

const A = "6afec267c939aae49ca91e14", B = "6afec267c939aae49ca91e15";
const CLD = "https://res.cloudinary.com/dxafyrgsi/image/upload/v1795080583/sara-royal/suit_img1.jpg";

test("public site URL: https origin from env, otherwise the live domain (never localhost / http)", () => {
  assert.equal(publicSiteUrl(undefined), DEFAULT_PUBLIC_SITE_URL);
  assert.equal(publicSiteUrl("https://sararoyalboutique.com/"), "https://sararoyalboutique.com");
  assert.equal(publicSiteUrl("https://www.example.in"), "https://www.example.in");
  for (const bad of ["http://localhost:3000", "http://sararoyalboutique.com", "javascript:alert(1)", "not a url", "https://u:p@x.com", "https://x.com/?a=1"]) assert.equal(publicSiteUrl(bad), DEFAULT_PUBLIC_SITE_URL, bad);
  assert.equal(suitPublicUrl(A, "https://sararoyalboutique.com"), `https://sararoyalboutique.com/suits/${A}`);
});

test("product image: real Cloudinary photo resized to 1200x630 JPEG over HTTPS; no placeholder when missing", () => {
  assert.equal(productImageUrl(CLD), "https://res.cloudinary.com/dxafyrgsi/image/upload/c_fill,g_auto,w_1200,h_630,q_auto:good,f_jpg/v1795080583/sara-royal/suit_img1.jpg");
  assert.equal(productImageUrl("https://cdn.example.com/a.jpg"), "https://cdn.example.com/a.jpg");
  for (const bad of ["", null, undefined, "http://res.cloudinary.com/x/image/upload/a.jpg", "/images/a.jpg", "data:image/png;base64,AAAA"]) assert.equal(productImageUrl(bad), null, String(bad));
});

test("order message: every item has name, SKU, quantity, unit price, subtotal and its product link; totals and terms kept", () => {
  const lines = [
    { name: "Rose Pink Chanderi Suit", sku: "SR-0001", quantity: 3, unitPricePaise: 199900, url: suitPublicUrl(A, DEFAULT_PUBLIC_SITE_URL) },
    { name: "Emerald Silk", sku: "SR-0002", quantity: 1, unitPricePaise: 220000, url: suitPublicUrl(B, DEFAULT_PUBLIC_SITE_URL) },
  ];
  const msg = buildOrderMessage(lines, "Sara Royal Boutique");
  const blocks = msg.split("\n\n");
  const first = blocks.find((b) => b.startsWith("1. Rose Pink")), second = blocks.find((b) => b.startsWith("2. Emerald"));
  assert.ok(first && second, msg);
  for (const part of ["SKU: SR-0001", "Quantity: 3", "Price: ₹1,999 each", "Subtotal: ₹5,997", `Product link: https://sararoyalboutique.com/suits/${A}`]) assert.ok(first.includes(part), part);
  for (const part of ["SKU: SR-0002", "Quantity: 1", "Price: ₹2,200 each", "Subtotal: ₹2,200", `Product link: https://sararoyalboutique.com/suits/${B}`]) assert.ok(second.includes(part), part);
  for (const part of ["Products total: ₹8,197", "shipping charges for my PIN code (not included", "Payment options: Cash on Delivery or Prepaid UPI."]) assert.ok(msg.includes(part), part);
  assert.ok(!/image|photo|attach/i.test(msg), "the message must not claim an image is attached");
  const wa = buildWhatsAppUrl("919988854440", msg);
  assert.equal(decodeURIComponent(wa.split("?text=")[1]), msg); // links survive URL encoding intact
});

test("order message: unsafe or missing links are left out, never inserted", () => {
  for (const url of [undefined, "", "http://localhost:3000/suits/x", "javascript:alert(1)", "https://u:p@evil.com/x"]) {
    const msg = buildOrderMessage([{ name: "A", sku: "SR-0001", quantity: 1, unitPricePaise: 100, url }]);
    assert.ok(!msg.includes("Product link"), String(url));
  }
});

test("Open Graph: title, description, canonical og:url and the real product image (1200x630, https)", () => {
  const meta = buildSuitMetadata({ _id: A, sku: "SR-0001", name: "Rose Pink Chanderi Suit", description: "Soft chanderi with embroidered neckline.", fabric: "Chanderi", color: "Rose pink", salePricePaise: 199900, stock: 4, fabricImages: [{ url: CLD }] }, DEFAULT_PUBLIC_SITE_URL);
  const url = `https://sararoyalboutique.com/suits/${A}`;
  assert.equal(meta.title, "Rose Pink Chanderi Suit — Sara Royal Boutique");
  assert.equal(meta.alternates.canonical, url);
  assert.equal(meta.openGraph.url, url);
  assert.equal(meta.openGraph.title, meta.title);
  assert.match(meta.openGraph.description, /Chanderi · Rose pink\. ₹1,999\. Soft chanderi/);
  assert.ok(meta.openGraph.description.length <= 200);
  const [img] = meta.openGraph.images;
  assert.equal(img.url, productImageUrl(CLD, OG_IMAGE_SIZE));
  assert.ok(img.url.startsWith("https://"));
  assert.deepEqual([img.width, img.height, img.type], [1200, 630, "image/jpeg"]);
  assert.equal(meta.twitter.card, "summary_large_image");
});

test("Open Graph: no photo means no og:image (no placeholder); unpublished/unknown suits get generic, noindex metadata", () => {
  const meta = buildSuitMetadata({ _id: A, sku: "SR-0001", name: "X", salePricePaise: 100, stock: 0, fabricImages: [] }, DEFAULT_PUBLIC_SITE_URL);
  assert.equal(meta.openGraph.images, undefined);
  assert.equal(meta.twitter.card, "summary");
  assert.match(suitDescription({ salePricePaise: 100, stock: 0 }), /out of stock/);
  assert.equal(buildSuitMetadata(null), GENERIC_SUIT_METADATA);
  assert.deepEqual(GENERIC_SUIT_METADATA.robots, { index: false, follow: true });
});

test("suit page wires metadata; cart + Buy on WhatsApp pass product links; share is opt-in only", () => {
  const page = fs.readFileSync("src/app/suits/[id]/page.tsx", "utf8");
  assert.match(page, /export async function generateMetadata/);
  assert.match(fs.readFileSync("src/pages/CartPage/CartPage.tsx", "utf8"), /url: suitPublicUrl\(i\.id\)/);
  const detail = fs.readFileSync("src/pages/SuitDetailPage/SuitDetailPage.tsx", "utf8");
  assert.match(detail, /url: suitPublicUrl\(suit\.id\)/);
  assert.match(detail, /<ShareProductButton /);
  const share = fs.readFileSync("src/components/shop/ShareProductButton.tsx", "utf8");
  const calls = [...share.matchAll(/navigator\.share\(/g)].length;
  assert.ok(calls >= 2);
  assert.ok(/const share = async \(\) =>/.test(share) && !/useEffect\([^)]*navigator\.share/s.test(share.replace(/const share = async[\s\S]*$/, "")), "navigator.share is only called from the tap handler");
  assert.match(share, /AbortError/);
  assert.match(share, /navigator\.clipboard\.writeText/);
  assert.match(share, /https:\/\/wa\.me\/\?text=/);
  assert.ok(!fs.readFileSync("src/components/shop/SuitCard.tsx", "utf8").includes("ShareProductButton"), "not on Collections cards");
});
