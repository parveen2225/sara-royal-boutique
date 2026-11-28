import test from "node:test";
import assert from "node:assert/strict";
import { formatInrPaise } from "../src/lib/money.ts";
import { parseStoredCart, addToCart, setQuantity, removeFromCart, cartSubtotalPaise, cartCount, applyValidation, MAX_CART_LINES, MAX_LINE_QTY } from "../src/lib/cartCore.ts";
import { buildOrderMessage, buildWhatsAppUrl, buildStatusMessage } from "../src/lib/suitWhatsapp.ts";

const id = (n) => String(n).padStart(24, "a");
const item = (n, over = {}) => ({ id: id(n), sku: `SR-000${n}`, name: `Suit ${n}`, image: "", unitPricePaise: 150000, maxQuantity: 5, ...over });

test("INR formatting: Indian grouping, exact", () => {
  assert.equal(formatInrPaise(0), "₹0");
  assert.equal(formatInrPaise(99900), "₹999");
  assert.equal(formatInrPaise(149950), "₹1,499.50");
  assert.equal(formatInrPaise(12345600), "₹1,23,456");
  assert.equal(formatInrPaise(1000000000), "₹1,00,00,000");
  assert.equal(formatInrPaise(5), "₹0.05");
});

test("cart: add merges lines and never exceeds stock", () => {
  let r = addToCart([], item(1), 2);
  assert.deepEqual([r.added, r.capped, r.items[0].quantity], [2, false, 2]);
  r = addToCart(r.items, item(1), 2);
  assert.equal(r.items[0].quantity, 4);
  r = addToCart(r.items, item(1), 5); // only 1 more fits (max 5)
  assert.deepEqual([r.items[0].quantity, r.added, r.capped], [5, 1, true]);
  r = addToCart(r.items, item(1), 1);
  assert.deepEqual([r.added, r.items[0].quantity], [0, 5]);
  assert.equal(addToCart([], item(2, { maxQuantity: 0 }), 1).error, "out_of_stock");
  assert.equal(r.items.length, 1);
});

test("cart: setQuantity clamps to stock; 0 removes; remove works; totals exact", () => {
  let items = addToCart(addToCart([], item(1), 2).items, item(2, { unitPricePaise: 99950 }), 1).items;
  assert.equal(cartSubtotalPaise(items), 2 * 150000 + 99950);
  assert.equal(cartCount(items), 3);
  items = setQuantity(items, id(1), 99);
  assert.equal(items.find((i) => i.id === id(1)).quantity, 5);
  items = setQuantity(items, id(2), 0);
  assert.equal(items.length, 1);
  assert.equal(removeFromCart(items, id(1)).length, 0);
});

test("cart: line limit and quantity ceiling", () => {
  let items = [];
  for (let n = 1; n <= MAX_CART_LINES; n++) items = addToCart(items, item(n, { maxQuantity: 500 }), 1).items;
  assert.equal(items.length, MAX_CART_LINES);
  assert.equal(addToCart(items, item(999, { maxQuantity: 5 }), 1).error, "cart_full");
  assert.equal(addToCart([], item(1, { maxQuantity: 500 }), 500).items[0].quantity, MAX_LINE_QTY);
});

test("cart: corrupt or hostile storage is ignored safely (restore after refresh)", () => {
  assert.deepEqual(parseStoredCart(null), []);
  assert.deepEqual(parseStoredCart("not json"), []);
  assert.deepEqual(parseStoredCart('{"a":1}'), []);
  const good = [item(1)].map((i) => ({ ...i, quantity: 2 }));
  assert.deepEqual(parseStoredCart(JSON.stringify(good)), good);
  const mixed = [{ ...item(1), quantity: 2 }, { ...item(1), quantity: 3 }, { ...item(2), quantity: 0 }, { ...item(3), quantity: 1.5 }, { ...item(4), unitPricePaise: -5, quantity: 1 }, { id: "nope", quantity: 1 }, null, 7, { ...item(5), quantity: 1000 }];
  const parsed = parseStoredCart(JSON.stringify(mixed));
  assert.deepEqual(parsed.map((i) => [i.id, i.quantity]), [[id(1), 2], [id(5), MAX_LINE_QTY]]);
});

test("cart validation: price refresh, stock clamp, unavailable lines flagged and kept", () => {
  const items = [item(1, { quantity: 4 }), item(2, { quantity: 1 }), item(3, { quantity: 1 }), item(4, { quantity: 2 })].map((i, n) => ({ ...i, quantity: [4, 1, 1, 2][n] }));
  const r = applyValidation(items, [
    { id: id(1), ok: false, issue: "insufficient_stock", name: "Suit 1", unitPricePaise: 140000, maxQuantity: 2 },
    { id: id(2), ok: false, issue: "out_of_stock" },
    { id: id(3), ok: false, issue: "unavailable" },
    { id: id(4), ok: true, unitPricePaise: 150000, maxQuantity: 9 },
  ]);
  assert.equal(r.canCheckout, false);
  assert.equal(r.items.length, 4);
  assert.deepEqual([r.items[0].quantity, r.items[0].unitPricePaise], [2, 140000]);
  assert.deepEqual(r.issues, { [id(1)]: "insufficient_stock", [id(2)]: "out_of_stock", [id(3)]: "unavailable" });
  assert.ok(r.changes.some((c) => /price updated/.test(c)));
  const clean = applyValidation([item(4, { quantity: 2 }), ].map((i) => ({ ...i, quantity: 2 })), [{ id: id(4), ok: true, unitPricePaise: 150000, maxQuantity: 9 }]);
  assert.equal(clean.canCheckout, true);
  // a quantity that was only reduced to the available stock does not block checkout, but is still reported
  const reduced = applyValidation([{ ...item(1), quantity: 4 }], [{ id: id(1), ok: false, issue: "insufficient_stock", unitPricePaise: 150000, maxQuantity: 2 }]);
  assert.deepEqual([reduced.canCheckout, reduced.items[0].quantity, reduced.issues[id(1)]], [true, 2, "insufficient_stock"]);
});

test("whatsapp order message: every required element, URL-encoded link", () => {
  const msg = buildOrderMessage([{ name: "Rose Cotton", sku: "SR-0001", quantity: 2, unitPricePaise: 150000 }, { name: "Blue & Gold Silk", sku: "SR-0002", quantity: 1, unitPricePaise: 249950 }], "Sara Royal Boutique");
  for (const part of ["Sara Royal Boutique", "Rose Cotton", "SR-0001", "Quantity: 2", "₹1,500 each", "Subtotal: ₹3,000", "Blue & Gold Silk", "SR-0002", "₹2,499.50 each", "Products total: ₹5,499.50", "availability", "shipping charges", "not included", "Cash on Delivery", "Prepaid UPI", "delivery address and PIN code"]) assert.ok(msg.includes(part), part);
  const url = buildWhatsAppUrl("919988854440", msg);
  assert.ok(url.startsWith("https://wa.me/919988854440?text="));
  assert.ok(!/[\s\n&]/.test(url.slice(url.indexOf("?text=") + 6)), "text must be fully percent-encoded");
  assert.equal(decodeURIComponent(url.split("?text=")[1]), msg);
  assert.equal(buildWhatsAppUrl("9988854440", "x"), null);
  assert.equal(buildWhatsAppUrl("", "x"), null);
  assert.match(buildOrderMessage([{ name: "A", sku: "SR-1", quantity: 1, unitPricePaise: 100 }]), /this unstitched suit/);
});

test("whatsapp status messages: shipped includes courier, tracking number and clickable URL", () => {
  const m = buildStatusMessage({ orderId: "SRO-2026-0001", status: "shipped", customerName: "Anita", courierName: "DTDC", trackingNumber: "D123", trackingUrl: "https://www.dtdc.in/track?x=D123" });
  for (const p of ["Anita", "SRO-2026-0001", "shipped", "DTDC", "D123", "https://www.dtdc.in/track?x=D123"]) assert.ok(m.includes(p), p);
  assert.match(buildStatusMessage({ orderId: "O1", status: "confirmed" }), /confirmed/);
  assert.match(buildStatusMessage({ orderId: "O1", status: "packed" }), /packed/);
  assert.match(buildStatusMessage({ orderId: "O1", status: "delivered" }), /delivered/);
});

test("product card Add to Cart: one unit at a time, stock-capped, out-of-stock refused, header count follows", async () => {
  const { cartAddFeedback } = await import("../src/lib/cartFeedback.ts");
  const suit = { id: "s1", sku: "SR-0001", name: "Rose", image: "", unitPricePaise: 199900, maxQuantity: 2 };
  let items = [];
  let r = addToCart(items, suit, 1);
  assert.deepEqual(cartAddFeedback(r, 2), { tone: "ok", text: "Added to your cart." });
  items = r.items;
  assert.equal(cartCount(items), 1);
  r = addToCart(items, suit, 1); items = r.items;
  assert.equal(cartCount(items), 2);
  r = addToCart(items, suit, 1); // stock is 2: nothing more is added
  assert.equal(r.added, 0);
  assert.equal(cartCount(r.items), 2);
  assert.match(cartAddFeedback(r, 2).text, /All 2 available are already in your cart/);
  const out = addToCart([], { ...suit, id: "s2", maxQuantity: 0 }, 1);
  assert.equal(out.error, "out_of_stock");
  assert.equal(cartCount(out.items), 0, "an out-of-stock suit never enters the cart");
  assert.equal(cartAddFeedback(out, 0).tone, "warn");
  const full = Array.from({ length: MAX_CART_LINES }, (_, i) => ({ ...suit, id: `x${i}`, quantity: 1 }));
  assert.match(cartAddFeedback(addToCart(full, { ...suit, id: "new" }, 1), 2).text, /cart is full/);
});

test("product card links: Add to Cart and View Details are always rendered, View Details points at the suit page", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("../src/components/shop/SuitCard.tsx", import.meta.url), "utf8");
  assert.match(src, /const href = `\/suits\/\$\{suit\.id\}`/);
  // linkHref = the suit page, or (Home cards, after a design thumbnail was clicked) that design on the suit page
  assert.match(src, /const linkHref = design \? `\$\{href\}\?v=\$\{encodeURIComponent\(design\.id\)\}` : href;/);
  assert.match(src, /<Link href=\{linkHref\} className="shop_btn shop_card_btn"[^>]*>View Details<\/Link>/);
  assert.match(src, /disabled=\{!suit\.inStock\}/);
  assert.doesNotMatch(src, /Try On/i, "AI Try-On stays on the Suit Details page only");
  const css = fs.readFileSync(new URL("../src/components/shop/shop.scss", import.meta.url), "utf8");
  const block = css.slice(css.indexOf(".shop_card_actions {"), css.indexOf(".shop_card_actions {") + 200);
  assert.doesNotMatch(block, /opacity:\s*0|display:\s*none|visibility:\s*hidden/, "actions must not be hidden until hover");
});
