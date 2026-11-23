import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { rupeesToPaise, formatPaise, discountPercent, checkPricing } from "../src/lib/money.ts";
import { normalizeWhatsAppNumber, normalizeLegacyWhatsAppNumber, isSafeHttpUrl, isObjectId, isGstin, readJsonBody, BadRequestError } from "../src/lib/validation.ts";
import { rateLimit } from "../src/lib/rateLimit.ts";
import { verifyJwtHs256 } from "../src/lib/auth/edgeJwt.ts";

test("money: exact paise parsing, no float drift", () => {
  assert.equal(rupeesToPaise("1499"), 149900);
  assert.equal(rupeesToPaise(1499.5), 149950);
  assert.equal(rupeesToPaise("0.1"), 10);
  assert.equal(rupeesToPaise("19.99"), 1999);
  for (const bad of ["-1", "1.234", "abc", "", "1e3", NaN, null, undefined, "99999999999"]) assert.equal(rupeesToPaise(bad), null, String(bad));
  assert.equal(formatPaise(149950), "1499.50");
  assert.equal(formatPaise(5), "0.05");
});

test("money: discount only when sale is lower", () => {
  assert.equal(discountPercent(200000, 150000), 25);
  assert.equal(discountPercent(299900, 199900), 33);
  assert.equal(discountPercent(100000, 100000), 0);
  assert.equal(discountPercent(100000, 120000), 0);
  assert.equal(discountPercent(0, 0), 0);
});

test("money: pricing check rejects sale above original, defaults sale to original", () => {
  assert.deepEqual(checkPricing("1000", "800"), { ok: true, originalPaise: 100000, salePaise: 80000 });
  assert.deepEqual(checkPricing("1000", undefined), { ok: true, originalPaise: 100000, salePaise: 100000 });
  assert.equal(checkPricing("1000", "1000.01").ok, false);
  assert.equal(checkPricing("-5", "1").ok, false);
});

test("whatsapp number needs a country code and valid shape", () => {
  assert.equal(normalizeWhatsAppNumber("+91 99888-54440"), "919988854440");
  assert.equal(normalizeWhatsAppNumber("919988854440"), "919988854440");
  assert.equal(normalizeWhatsAppNumber("+14155550123"), "14155550123");
  for (const bad of ["9988854440", "+91 12345 67890", "+91998885444", "abc", "", "0919988854440", "+9199888544401234567", null]) {
    assert.equal(normalizeWhatsAppNumber(bad), null, String(bad));
  }
});

test("legacy env WhatsApp number: bare 10-digit Indian mobile is read as +91, nothing else is guessed", () => {
  assert.equal(normalizeLegacyWhatsAppNumber("9988854440"), "919988854440");
  assert.equal(normalizeLegacyWhatsAppNumber(" 99888-54440 "), "919988854440");
  assert.equal(normalizeLegacyWhatsAppNumber("+91 99888 54440"), "919988854440");
  assert.equal(normalizeLegacyWhatsAppNumber("+14155550123"), "14155550123");
  for (const bad of ["5988854440", "998885444", "+9988854440x", "abc", "", undefined, null, "0998885444"]) {
    assert.equal(normalizeLegacyWhatsAppNumber(bad), null, String(bad));
  }
});

test("url / id / gstin validators", () => {
  assert.ok(isSafeHttpUrl("https://www.indiapost.gov.in/track?id=1"));
  for (const bad of ["javascript:alert(1)", "data:text/html,x", "ftp://x.com", "https://user:pw@x.com", "not a url", "x".repeat(3000)]) assert.equal(isSafeHttpUrl(bad), false, bad.slice(0, 20));
  assert.ok(isObjectId("507f1f77bcf86cd799439011"));
  assert.equal(isObjectId("123"), false);
  assert.ok(isGstin("03ABCDE1234F1Z5"));
  assert.equal(isGstin("12345"), false);
});

test("readJsonBody rejects non-objects and oversize bodies", async () => {
  const mk = (b) => new Request("http://x", { method: "POST", body: b });
  assert.deepEqual(await readJsonBody(mk('{"a":1}')), { a: 1 });
  await assert.rejects(readJsonBody(mk("[1]")), BadRequestError);
  await assert.rejects(readJsonBody(mk("nope")), BadRequestError);
  await assert.rejects(readJsonBody(mk(JSON.stringify({ a: "x".repeat(500) })), 100), BadRequestError);
});

test("rate limiter blocks after the limit and recovers after the window", () => {
  const k = "t:" + Math.random();
  for (let i = 0; i < 3; i++) assert.ok(rateLimit(k, 3, 1000, 0).allowed);
  const blocked = rateLimit(k, 3, 1000, 10);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec >= 1);
  assert.ok(rateLimit(k, 3, 1000, 2000).allowed);
});

const b64u = (b) => Buffer.from(b).toString("base64url");
const sign = (payload, secret, alg = "HS256") => {
  const h = b64u(JSON.stringify({ alg, typ: "JWT" })), p = b64u(JSON.stringify(payload));
  return `${h}.${p}.${crypto.createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url")}`;
};
test("edge JWT verification: signature, expiry, algorithm", async () => {
  const now = Math.floor(Date.now() / 1000);
  const good = sign({ id: "1", exp: now + 60 }, "s3cret");
  assert.equal(await verifyJwtHs256(good, "s3cret"), true);
  assert.equal(await verifyJwtHs256(good, "other"), false);
  assert.equal(await verifyJwtHs256(sign({ id: "1", exp: now - 5 }, "s3cret"), "s3cret"), false);
  assert.equal(await verifyJwtHs256(sign({ id: "1", exp: now + 60 }, "s3cret", "none"), "s3cret"), false);
  assert.equal(await verifyJwtHs256("a.b.c", "s3cret"), false);
  assert.equal(await verifyJwtHs256(good, ""), false);
});
