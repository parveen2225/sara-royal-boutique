// Gemini provider: request shape, response parsing, error mapping, settings and provider selection.
// No network: nothing here calls Google (fetch is never reached in these unit tests).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const G = await import("../src/lib/tryOn/providers/gemini.ts");
const P = await import("../src/lib/tryOn/providers/index.ts");
const CFG = await import("../src/lib/tryOn/config.ts");
const STY = await import("../src/lib/tryOn/styles.ts");
const { TryOnProviderError } = await import("../src/lib/tryOn/providers/types.ts");

const FAKE_KEY = "AIzaFAKE-unit-test-key-0000000000000000";
const img = (s) => ({ bytes: Buffer.from(s), contentType: "image/jpeg" });
const input = (over = {}) => ({ person: img("PERSON"), fabric: img("FABRIC"), reference: null, style: STY.styleByKey("anarkali"), prompt: "PROMPT", suit: { name: "x", fabric: "", color: "" }, ...over });
const withEnv = (vars, fn) => {
  const old = {};
  for (const k of Object.keys(vars)) { old[k] = process.env[k]; if (vars[k] === undefined) delete process.env[k]; else process.env[k] = vars[k]; }
  try { return fn(); } finally { for (const k of Object.keys(vars)) { if (old[k] === undefined) delete process.env[k]; else process.env[k] = old[k]; } }
};
const codeOf = (fn) => { try { fn(); return "no-throw"; } catch (e) { assert.ok(e instanceof TryOnProviderError); return e.code; } };

test("request: model, ordered images (person, fabric, reference), portrait 1K JPEG, store:false, no key in body", () => {
  const body = withEnv({ TRYON_GEMINI_MODEL: undefined, TRYON_GEMINI_IMAGE_SIZE: undefined, TRYON_GEMINI_ASPECT_RATIO: undefined, TRYON_GEMINI_THINKING_LEVEL: undefined }, () => G.buildGeminiRequest(input({ reference: img("REF") })));
  assert.equal(body.model, "gemini-nano-banana-2.1");
  assert.equal(body.store, false, "Google must not keep the interaction");
  assert.deepEqual(body.response_format, { type: "image", mime_type: "image/jpeg", aspect_ratio: "2:3", image_size: "1K" });
  assert.equal(body.generation_config, undefined);
  assert.deepEqual(body.input.map((p) => p.type), ["text", "image", "image", "image"]);
  assert.equal(body.input[0].text, "PROMPT");
  assert.deepEqual(body.input.slice(1).map((p) => Buffer.from(p.data, "base64").toString()), ["PERSON", "FABRIC", "REF"]);
  assert.ok(body.input.slice(1).every((p) => p.mime_type === "image/jpeg"));
  assert.ok(!JSON.stringify(body).includes(FAKE_KEY));
  const noRef = G.buildGeminiRequest(input());
  assert.equal(noRef.input.length, 3);
});

test("settings: safe defaults, allow-listed overrides only (never 4K)", () => {
  withEnv({ TRYON_GEMINI_MODEL: "gemini-3-pro-image", TRYON_GEMINI_IMAGE_SIZE: "2K", TRYON_GEMINI_ASPECT_RATIO: "3:4", TRYON_GEMINI_THINKING_LEVEL: "minimal" }, () => {
    const s = CFG.geminiSettings();
    assert.deepEqual(s, { model: "gemini-3-pro-image", imageSize: "2K", aspectRatio: "3:4", thinkingLevel: "minimal" });
    assert.deepEqual(G.buildGeminiRequest(input()).generation_config, { thinking_level: "minimal" });
  });
  withEnv({ TRYON_GEMINI_MODEL: "../../evil?x=1", TRYON_GEMINI_IMAGE_SIZE: "4K", TRYON_GEMINI_ASPECT_RATIO: "21:9", TRYON_GEMINI_THINKING_LEVEL: "xhigh" }, () => {
    assert.deepEqual(CFG.geminiSettings(), { model: "gemini-nano-banana-2.1", imageSize: "1K", aspectRatio: "2:3", thinkingLevel: "" });
  });
});

test("monthly cap setting: 300 by default, configurable, bounded", () => {
  withEnv({ TRYON_MONTHLY_LIMIT_TOTAL: undefined }, () => assert.equal(CFG.tryOnSettings().monthlyTotal, 300));
  withEnv({ TRYON_MONTHLY_LIMIT_TOTAL: "50" }, () => assert.equal(CFG.tryOnSettings().monthlyTotal, 50));
  withEnv({ TRYON_MONTHLY_LIMIT_TOTAL: "0" }, () => assert.equal(CFG.tryOnSettings().monthlyTotal, 300));
  withEnv({ TRYON_MONTHLY_LIMIT_TOTAL: "lots" }, () => assert.equal(CFG.tryOnSettings().monthlyTotal, 300));
});

test("quota periods use India Standard Time calendar days and months", () => {
  assert.deepEqual(CFG.quotaPeriods(Date.parse("2026-11-30T18:29:59Z")), { day: "2026-11-30", month: "2026-11" });
  assert.deepEqual(CFG.quotaPeriods(Date.parse("2026-11-30T18:30:00Z")), { day: "2026-12-01", month: "2026-12" }); // 00:00 IST
});

test("response: final image from model_output steps (last image wins), legacy candidates accepted", () => {
  const png = Buffer.from("\x89PNG-final");
  const r = G.parseGeminiInteraction({
    id: "v1_x", status: "completed",
    steps: [
      { type: "user_input", content: [{ type: "image", mime_type: "image/jpeg", data: Buffer.from("echo").toString("base64") }] },
      { type: "model_output", content: [{ type: "text", text: "Here you go" }, { type: "image", mime_type: "image/png", data: Buffer.from("interim").toString("base64") }, { type: "image", mime_type: "image/png", data: png.toString("base64") }] },
    ],
    usage: { total_tokens: 10 },
  });
  assert.equal(r.contentType, "image/png");
  assert.deepEqual(r.bytes, png);
  const legacy = G.parseGeminiInteraction({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "ok" }, { inlineData: { mimeType: "image/jpeg", data: Buffer.from("JPG").toString("base64") } }] } }] });
  assert.equal(legacy.bytes.toString(), "JPG");
});

test("response: refusals and failures map to friendly codes", () => {
  assert.equal(codeOf(() => G.parseGeminiInteraction({ status: "completed", steps: [{ type: "model_output", content: [{ type: "text", text: "I can't help with that." }] }] })), "safety_blocked");
  assert.equal(codeOf(() => G.parseGeminiInteraction({ status: "failed", errors: [{ code: "safety", message: "Blocked by safety filters" }] })), "safety_blocked");
  assert.equal(codeOf(() => G.parseGeminiInteraction({ status: "failed", errors: [{ code: "internal", message: "oops" }] })), "unavailable");
  assert.equal(codeOf(() => G.parseGeminiInteraction({ promptFeedback: { blockReason: "PROHIBITED_CONTENT" } })), "safety_blocked");
  assert.equal(codeOf(() => G.parseGeminiInteraction({ candidates: [{ finishReason: "IMAGE_SAFETY", content: { parts: [] } }] })), "safety_blocked");
  assert.equal(codeOf(() => G.parseGeminiInteraction({ status: "in_progress", steps: [] })), "unknown");
  assert.equal(codeOf(() => G.parseGeminiInteraction(null)), "unknown");
  assert.equal(codeOf(() => G.parseGeminiInteraction({ status: "completed", steps: [{ type: "model_output", content: [{ type: "image", mime_type: "image/svg+xml", data: "PHN2Zz4=" }] }] })), "unknown");
});

test("HTTP errors: rate limits and outages retry; key/billing problems never reach the customer as such", () => {
  const e = (status, body) => G.geminiHttpError(status, body);
  assert.deepEqual([e(429, {}).code, e(429, {}).retryable], ["rate_limited", true]);
  assert.deepEqual([e(503, {}).code, e(503, {}).retryable], ["unavailable", true]);
  assert.equal(e(500, {}).retryable, true);
  assert.equal(e(504, {}).code, "timeout");
  assert.equal(e(401, {}).code, "unavailable");
  assert.equal(e(403, { error: { status: "PERMISSION_DENIED" } }).code, "unavailable");
  assert.equal(e(400, { error: { status: "INVALID_ARGUMENT", message: "API key not valid. Please pass a valid API key." } }).code, "unavailable");
  assert.equal(e(400, { error: { status: "FAILED_PRECONDITION", message: "Billing is not enabled" } }).code, "unavailable");
  assert.equal(e(400, { error: { status: "INVALID_ARGUMENT", message: "Request blocked by safety policy" } }).code, "safety_blocked");
  assert.equal(e(400, { error: { status: "INVALID_ARGUMENT", message: "Unable to process input image" } }).code, "invalid_input");
  assert.equal(e(400, {}).retryable, false);
  assert.ok(!e(400, { error: { message: "secret upstream detail" } }).message.includes("secret"), "upstream text is not kept");
});

test("provider selection: off/unknown/mock/gemini; gemini needs a key; mock stays available", () => {
  withEnv({ TRYON_PROVIDER: undefined, GEMINI_API_KEY: FAKE_KEY }, () => assert.equal(P.getTryOnProvider(), null));
  withEnv({ TRYON_PROVIDER: "off", GEMINI_API_KEY: FAKE_KEY }, () => assert.equal(P.getTryOnProvider(), null));
  withEnv({ TRYON_PROVIDER: "gemini-pro", GEMINI_API_KEY: FAKE_KEY }, () => assert.equal(P.getTryOnProvider(), null));
  withEnv({ TRYON_PROVIDER: "gemini", GEMINI_API_KEY: undefined }, () => assert.equal(P.getTryOnProvider(), null));
  withEnv({ TRYON_PROVIDER: "gemini", GEMINI_API_KEY: "short" }, () => assert.equal(P.getTryOnProvider(), null));
  withEnv({ TRYON_PROVIDER: "Gemini", GEMINI_API_KEY: FAKE_KEY }, () => {
    const p = P.getTryOnProvider();
    assert.equal(p.id, "gemini");
    assert.equal(p.isLive, true);
    assert.ok(!JSON.stringify(p).includes(FAKE_KEY), "key is not exposed on the provider object");
  });
  withEnv({ TRYON_PROVIDER: "mock" }, () => assert.deepEqual([P.getTryOnProvider().id, P.getTryOnProvider().isLive], ["mock", false]));
  assert.equal(P.PROVIDER_LABEL.gemini, "Google Gemini");
});

test("static: GEMINI_API_KEY is read only by the server provider, never logged, never public", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const files = [];
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(ts|tsx|js|jsx|mjs)$/.test(f.name)) files.push(p); } };
  walk(path.join(root, "src"));
  const readers = files.filter((f) => /process\.env(\.GEMINI_API_KEY|\[["'`]GEMINI_API_KEY)/.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(root, f));
  assert.deepEqual(readers, ["src/lib/tryOn/providers/gemini.ts"]);
  const src = fs.readFileSync(path.join(root, "src/lib/tryOn/providers/gemini.ts"), "utf8");
  assert.doesNotMatch(src, /^\s*["']use client["']/m);
  assert.doesNotMatch(src, /console\./, "the provider never logs (no key, image or response can leak)");
  assert.doesNotMatch(src, /NEXT_PUBLIC_GEMINI|EXPO_PUBLIC_GEMINI/);
  for (const f of files.filter((f) => /["']use client["']/.test(fs.readFileSync(f, "utf8")))) {
    assert.doesNotMatch(fs.readFileSync(f, "utf8"), /providers\/gemini|GEMINI_API_KEY/, `${path.relative(root, f)} must not import the provider`);
  }
  const example = fs.readFileSync(path.join(root, ".env.example"), "utf8");
  assert.match(example, /^# GEMINI_API_KEY=\s/m, ".env.example documents the name only, with no value");
  assert.match(example, /^# TRYON_PROVIDER=off/m);
});
