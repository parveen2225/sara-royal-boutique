import test from "node:test";
import assert from "node:assert/strict";
import { sniffImageType, validateImageFile, MAX_UPLOAD_BYTES } from "../src/lib/imageUpload.ts";
import { isCloudinaryImageUrl, publicIdFromUrl } from "../src/lib/cloudinaryUrl.ts";
import { parseImages, parseSuitInput, stockState, serializeAdminSuit } from "../src/lib/suitInput.ts";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const GIF = new TextEncoder().encode("GIF89a....");
const WEBP = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
const u = (n) => `https://res.cloudinary.com/demo/image/upload/v1700000000/sara-royal/img-${n}.jpg`;

test("upload: file signatures are sniffed and must match the declared type", () => {
  assert.equal(sniffImageType(PNG), "image/png");
  assert.equal(sniffImageType(JPG), "image/jpeg");
  assert.equal(sniffImageType(GIF), "image/gif");
  assert.equal(sniffImageType(WEBP), "image/webp");
  assert.equal(sniffImageType(new TextEncoder().encode("<?php echo 1;")), null);
  assert.equal(validateImageFile("image/png", PNG.length, PNG), null);
  assert.match(validateImageFile("image/png", JPG.length, JPG), /does not match/);
  assert.match(validateImageFile("image/png", 10, new TextEncoder().encode("not an image")), /does not match/);
  assert.match(validateImageFile("text/html", 5, PNG), /Only JPG/);
  assert.match(validateImageFile("image/svg+xml", 5, PNG), /Only JPG/);
  assert.match(validateImageFile("image/png", 0, new Uint8Array()), /empty/);
  assert.match(validateImageFile("image/png", MAX_UPLOAD_BYTES + 1, PNG), /5MB/);
});

test("cloudinary urls: only https res.cloudinary.com image URLs; public id derived safely", () => {
  assert.ok(isCloudinaryImageUrl(u(1)));
  for (const bad of ["http://res.cloudinary.com/demo/image/upload/a.jpg", "https://evil.com/image/upload/a.jpg", "https://res.cloudinary.com.evil.com/demo/image/upload/a.jpg", "https://res.cloudinary.com/demo/raw/upload/a.pdf", "javascript:alert(1)", "https://user:pw@res.cloudinary.com/demo/image/upload/a.jpg", 5, null]) assert.equal(isCloudinaryImageUrl(bad), false, String(bad));
  assert.equal(publicIdFromUrl(u(7)), "sara-royal/img-7");
  assert.equal(publicIdFromUrl("https://res.cloudinary.com/demo/image/upload/sara-royal/x.png"), "sara-royal/x");
  assert.equal(publicIdFromUrl("https://res.cloudinary.com/demo/image/upload/w_100,h_100/v1/sara-royal/x.png"), ""); // transformed URL: do not guess
  assert.equal(publicIdFromUrl("https://example.com/x.png"), "");
});

test("images: order preserved, duplicates/limits/foreign hosts rejected", () => {
  const ok = parseImages([u(3), u(1), { url: u(2) }], 10, "Fabric images");
  assert.ok(ok.ok);
  assert.deepEqual(ok.images.map((i) => i.publicId), ["sara-royal/img-3", "sara-royal/img-1", "sara-royal/img-2"]);
  assert.equal(parseImages([u(1), u(1)], 10, "Fabric images").ok, false);
  assert.equal(parseImages(Array.from({ length: 11 }, (_, i) => u(i)), 10, "Fabric images").ok, false);
  assert.equal(parseImages(Array.from({ length: 10 }, (_, i) => u(i)), 10, "Fabric images").ok, true);
  assert.equal(parseImages(Array.from({ length: 6 }, (_, i) => u(i)), 5, "Reference images").ok, false);
  assert.equal(parseImages(["https://evil.com/a.jpg"], 10, "Fabric images").ok, false);
  assert.equal(parseImages("nope", 10, "Fabric images").ok, false);
  assert.equal(parseImages([], 10, "Fabric images").ok, true);
});

test("stock states: 0 out, 1-3 low, 4+ in stock", () => {
  assert.deepEqual([0, 1, 3, 4, 50].map(stockState), ["out_of_stock", "low_stock", "low_stock", "in_stock", "in_stock"]);
});

test("create payload: required fields, pricing, publish needs an image, status/stock rules", () => {
  const good = { name: " Rose Cotton ", originalPrice: "1999.50", salePrice: 1500, fabric: "Cotton" };
  const r = parseSuitInput(good, { isCreate: true });
  assert.ok(r.ok);
  assert.equal(r.data.name, "Rose Cotton");
  assert.equal(r.data.originalPricePaise, 199950);
  assert.equal(r.data.salePricePaise, 150000);
  assert.equal(parseSuitInput({ name: "A", originalPrice: 500 }, { isCreate: true }).data.salePricePaise, 50000); // sale defaults to original
  for (const bad of [{}, { name: "A" }, { name: "A", originalPrice: -1 }, { name: "A", originalPrice: 100, salePrice: 101 }, { name: "A", originalPrice: "12.345" }, { name: "A", originalPrice: 100, stock: -1 }, { name: "A", originalPrice: 100, stock: 1.5 }, { name: "A", originalPrice: 100, stock: "5" }, { name: "A", originalPrice: 100, status: "live" }, { name: "A", originalPrice: 100, status: "published" }, { name: "A", originalPrice: 100, categoryIds: ["x"] }, { name: "A", originalPrice: 100, featured: "yes" }]) {
    assert.equal(parseSuitInput(bad, { isCreate: true }).ok, false, JSON.stringify(bad));
  }
  assert.ok(parseSuitInput({ name: "A", originalPrice: 100, status: "published", fabricImages: [u(1)] }, { isCreate: true }).ok);
});

test("update payload: partial price checks use the stored values; status/stock/sku refused", () => {
  const existing = { originalPricePaise: 100000, salePricePaise: 80000 };
  assert.equal(parseSuitInput({ salePrice: 900 }, { isCreate: false, existing }).data.salePricePaise, 90000);
  assert.equal(parseSuitInput({ salePrice: 1000.01 }, { isCreate: false, existing }).ok, false);
  assert.equal(parseSuitInput({ originalPrice: 700 }, { isCreate: false, existing }).ok, false); // would leave sale (800) above original
  assert.equal(parseSuitInput({ originalPrice: 900 }, { isCreate: false, existing }).ok, true);
  for (const k of ["status", "stock", "sku"]) assert.equal(parseSuitInput({ [k]: 1 }, { isCreate: false, existing }).ok, false, k);
  assert.equal(parseSuitInput({ name: "" }, { isCreate: false, existing }).ok, false);
});

test("admin serialization: derived discount and stock state; paise exposed exactly", () => {
  const s = serializeAdminSuit({ _id: "1", sku: "SR-0001", name: "N", originalPricePaise: 200000, salePricePaise: 150000, stock: 2, status: "draft", fabricImages: [{ url: u(1), publicId: "p" }] });
  assert.equal(s.discountPercent, 25);
  assert.equal(s.stockState, "low_stock");
  assert.equal(s.originalPrice, 2000);
  assert.equal(serializeAdminSuit({ _id: "2", sku: "SR-0002", name: "N", originalPricePaise: 1000, salePricePaise: 1000, stock: 0, status: "published" }).discountPercent, 0);
});
