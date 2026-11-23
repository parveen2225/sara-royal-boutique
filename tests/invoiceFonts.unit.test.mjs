import test from "node:test";
import assert from "node:assert/strict";
import { scriptOf, toRuns } from "../src/lib/invoiceFonts.ts";
import { clean, rs, invoiceContent } from "../src/lib/invoiceText.ts";

const all = () => true;
const only = (set) => (font, cp) => set[font]?.(cp) ?? false;

test("scriptOf: Devanagari, Gurmukhi, Latin and neutral characters", () => {
  assert.equal(scriptOf("अ".codePointAt(0)), "deva");
  assert.equal(scriptOf("।".codePointAt(0)), "deva");
  assert.equal(scriptOf("ਅ".codePointAt(0)), "guru");
  assert.equal(scriptOf("੧".codePointAt(0)), "guru");
  assert.equal(scriptOf("A".codePointAt(0)), "latin");
  assert.equal(scriptOf("é".codePointAt(0)), "latin");
  for (const ch of [" ", "5", ",", "-", "/", "₹", "‍", "‌", "(", ")"]) assert.equal(scriptOf(ch.codePointAt(0)), "neutral", JSON.stringify(ch));
});

test("toRuns: mixed-script text is split into one run per font; neutrals follow their neighbour; ZWJ stays in its script", () => {
  const runs = toRuns("ਅਨੀਤਾ / अनीता / Anita 12", all);
  assert.deepEqual(runs.map((r) => r.font), ["guru", "deva", "latin"]);
  assert.equal(runs.map((r) => r.text).join(""), "ਅਨੀਤਾ / अनीता / Anita 12");
  assert.deepEqual(toRuns("क्‍ष", all).map((r) => r.font), ["deva"]);
  assert.deepEqual(toRuns("  12 अ", all).map((r) => r.font), ["deva"]); // leading neutrals take the first real script
  assert.deepEqual(toRuns("", all), []);
});

test("toRuns: characters a font cannot draw fall back to the Latin font, else '?'", () => {
  const covers = only({ latin: (cp) => cp < 0x250 || cp === 0x20b9, guru: (cp) => cp >= 0xa00 && cp < 0xa80 });
  assert.equal(toRuns("ਅ٣x", covers).map((r) => r.text).join(""), "ਅ?x"); // Arabic-Indic digit: no font has it
  assert.equal(toRuns("你好", covers).map((r) => r.text).join(""), "??");
  assert.equal(toRuns("₹5", covers)[0].font, "latin");
  assert.equal(toRuns("अ", covers).map((r) => r.text).join(""), "?"); // no Devanagari coverage in this fake set
});

test("invoice text: Unicode is preserved (NFC), control characters removed, rupee sign used", () => {
  assert.equal(clean("ਅਨੀਤਾ\u0000 कौर\u0007"), "ਅਨੀਤਾ  कौर ");
  assert.equal(clean("Á"), "Á"); // normalised
  assert.equal(rs(149950), "₹1,499.50");
  const c = invoiceContent({ invoiceId: "I", orderId: "O", issuedAt: new Date(), snapshot: { business: { name: "सारा" }, gst: {}, customer: { name: "ਗੁਰਪ੍ਰੀਤ", phone: "919876543210", address: "x", pincode: "140301" }, items: [{ sku: "S", name: "सूट", quantity: 1, unitPricePaise: 100, lineTotalPaise: 100 }], subtotalPaise: 100, deliveryChargePaise: 0, totalPaise: 100, paymentMethod: "cod" } });
  assert.equal(c.billTo[0], "ਗੁਰਪ੍ਰੀਤ");
  assert.equal(c.businessLines[0], "सारा");
  assert.equal(c.rows[0].description, "सूट (S)");
});
