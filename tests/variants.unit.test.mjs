import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { addToCart, applyValidation, lineKey, parseStoredCart, removeFromCart, serializeCart, setQuantity } from "../src/lib/cartCore.ts";
import { buildOrderMessage, variantPageUrl } from "../src/lib/suitWhatsapp.ts";
import { parseVariants, planVariants } from "../src/lib/suitInput.ts";

const SUIT = "64b000000000000000000001";
const V = ["64b0000000000000000000a1", "64b0000000000000000000a2", "64b0000000000000000000a3"];
const line = (variantId, over = {}) => ({ id: SUIT, sku: "SR-0005", name: "Chanderi", image: `https://res.cloudinary.com/demo/image/upload/v1/${variantId ?? "main"}.jpg`, unitPricePaise: 250000, maxQuantity: 1, ...(variantId ? { variantId, variantCode: `SR-0005-V${V.indexOf(variantId) + 1}` } : {}), ...over });

test("cart: two variants of one suit are separate lines; each is capped at its own stock", () => {
  let r = addToCart([], line(V[0]), 1);
  r = addToCart(r.items, line(V[1]), 3);
  assert.equal(r.items.length, 2);
  assert.deepEqual(r.items.map((i) => [lineKey(i), i.quantity]), [[`${SUIT}:${V[0]}`, 1], [`${SUIT}:${V[1]}`, 1]]);
  assert.equal(r.capped, true, "only 1 piece of V2 exists");
  r = addToCart(r.items, line(V[0]), 1);
  assert.deepEqual([r.added, r.items.length], [0, 2], "V1 already has its only piece in the cart");
  assert.deepEqual(setQuantity(r.items, `${SUIT}:${V[1]}`, 0).map(lineKey), [`${SUIT}:${V[0]}`]);
  assert.deepEqual(removeFromCart(r.items, `${SUIT}:${V[0]}`).map(lineKey), [`${SUIT}:${V[1]}`]);
});

test("cart: suits without variants keep the suit id as their key (existing carts and callers work unchanged)", () => {
  const r = addToCart([], line(undefined, { maxQuantity: 5 }), 2);
  assert.equal(lineKey(r.items[0]), SUIT);
  assert.equal(setQuantity(r.items, SUIT, 4)[0].quantity, 4);
  assert.deepEqual(removeFromCart(r.items, SUIT), []);
  const legacy = JSON.stringify([{ id: SUIT, sku: "SR-0005", name: "Old", image: "", unitPricePaise: 100, quantity: 1, maxQuantity: 2 }]);
  assert.deepEqual(parseStoredCart(legacy).map((i) => [i.id, i.variantId]), [[SUIT, undefined]]);
});

test("cart storage: variant survives a reload; duplicates per line are dropped; malformed variant ids are ignored", () => {
  const items = [{ ...line(V[0]), quantity: 1 }, { ...line(V[1]), quantity: 1 }];
  const back = parseStoredCart(serializeCart([...items, items[0]]));
  assert.deepEqual(back.map((i) => [i.variantId, i.variantCode]), [[V[0], "SR-0005-V1"], [V[1], "SR-0005-V2"]]);
  assert.equal(parseStoredCart(JSON.stringify([{ ...items[0], variantId: "../evil" }]))[0].variantId, undefined);
});

test("cart validation merges per line: a sold-out variant is flagged without touching the other variant", () => {
  const items = [{ ...line(V[0]), quantity: 1 }, { ...line(V[1]), quantity: 1 }];
  const r = applyValidation(items, [
    { id: SUIT, variantId: V[0], variantCode: "SR-0005-V1", ok: false, issue: "out_of_stock", maxQuantity: 0 },
    { id: SUIT, variantId: V[1], variantCode: "SR-0005-V2", ok: true, maxQuantity: 1, unitPricePaise: 250000 },
  ]);
  assert.deepEqual(r.issues, { [`${SUIT}:${V[0]}`]: "out_of_stock" });
  assert.deepEqual(r.items.map((i) => i.maxQuantity), [0, 1]);
  assert.equal(r.canCheckout, false);
});

test("WhatsApp: the message names the chosen design, links its photo, and the product link opens that design", () => {
  const url = variantPageUrl("https://sararoyal.in/suits/abc", V[1]);
  assert.equal(url, `https://sararoyal.in/suits/abc?v=${V[1]}`);
  assert.equal(variantPageUrl("https://sararoyal.in/suits/abc"), "https://sararoyal.in/suits/abc");
  const text = buildOrderMessage([{ name: "Chanderi", sku: "SR-0005", quantity: 1, unitPricePaise: 250000, url, variant: "SR-0005-V2", image: "https://res.cloudinary.com/demo/image/upload/v1/v2.jpg" }]);
  assert.match(text, /SKU: SR-0005\n {3}Design: SR-0005-V2\n {3}Design photo: https:\/\/res\.cloudinary\.com\/demo\/image\/upload\/v1\/v2\.jpg\n {3}Quantity: 1/);
  assert.match(text, new RegExp(`Product link: https://sararoyal\\.in/suits/abc\\?v=${V[1]}`));
  // plain suits: the message is exactly as before
  const plain = buildOrderMessage([{ name: "Plain", sku: "SR-0001", quantity: 2, unitPricePaise: 100000 }]);
  assert.doesNotMatch(plain, /Design/);
});

test("variant input: existing variants never take a stock number from the form; new ones take their opening stock", () => {
  const img = "https://res.cloudinary.com/demo/image/upload/v1/sara-royal/a.jpg";
  const r = parseVariants([{ id: V[0], images: [img], stock: 50 }, { images: [img], stock: 2 }], false);
  assert.equal(r.ok, true);
  assert.deepEqual(r.variants.map((v) => [v.id, v.stock]), [[V[0], undefined], [undefined, 2]]);
  assert.equal(parseVariants([{ images: [] }], false).ok, false);
  assert.equal(parseVariants([{ id: V[0], images: [img] }, { id: V[0], images: [img] }], false).ok, false, "same variant twice");
});

test("variant plan: keeps codes and current stock, issues new codes after the highest ever used, refuses removing stocked variants", () => {
  const cur = { sku: "SR-0005", stock: 3, variantSeq: 4, variants: [{ _id: V[0], code: "SR-0005-V1", stock: 2 }, { _id: V[1], code: "SR-0005-V4", stock: 1 }] };
  const img = [{ url: "u", publicId: "" }];
  let n = 0;
  const p = planVariants(cur, [{ id: V[1], images: img }, { images: img, stock: 5 }, { id: V[0], images: img }], () => `new-${++n}`);
  assert.equal(p.ok, true);
  assert.deepEqual(p.variants.map((v) => [v.code, v.stock]), [["SR-0005-V4", 1], ["SR-0005-V5", 5], ["SR-0005-V1", 2]]);
  assert.deepEqual([p.stock, p.variantSeq, p.movedFromBase], [8, 5, 0]);
  const refused = planVariants(cur, [{ id: V[1], images: img }], () => "x");
  assert.deepEqual([refused.ok, refused.status], [false, 409]);
  assert.equal(planVariants(cur, [{ id: V[2], images: img }], () => "x").ok, false, "unknown variant id (removed meanwhile)");
  // a plain suit getting its first variants: its stock is reported so the route can audit the move
  const conv = planVariants({ sku: "SR-0009", stock: 4, variants: [] }, [{ images: img, stock: 1 }], () => "x");
  assert.deepEqual([conv.stock, conv.movedFromBase, conv.variants[0].code], [1, 4, "SR-0009-V1"]);
});

test("website and mobile app share the same cart logic (variant lines included)", () => {
  const app = "../sara-royal-boutique-Native/src/lib/shop/cartCore.ts";
  if (!fs.existsSync(app)) return; // the app lives in its own repository; checked when both are side by side
  assert.equal(fs.readFileSync(app, "utf8"), fs.readFileSync("src/lib/cartCore.ts", "utf8"));
});
