// AI Try-On end to end with TRYON_PROVIDER=gemini against an in-memory MongoDB. Google is NEVER called: global fetch is
// replaced by a stub that answers like the Gemini Interactions API and fails the test on any other external URL.
import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { startTestEnv } from "./helpers/testEnv.mjs";

const FAKE_KEY = "AIzaFAKE-integration-key-000000000000000";
const GEMINI = "https://generativelanguage.googleapis.com/v1beta/interactions";
let env, Suit, Job, Asset, Usage, nextSku, R = {}, S, STY;
const realFetch = globalThis.fetch;
const ctx = (id) => ({ params: Promise.resolve({ id }) });
let ipN = 0;
const ip = () => `10.77.${Math.floor(++ipN / 250)}.${ipN % 250}`;
const jpeg = (w, h, color = { r: 120, g: 80, b: 60 }) => sharp({ create: { width: w, height: h, channels: 3, background: color } }).jpeg().toBuffer();
let PERSON, FABRIC, OUT_PNG;

// Programmable Gemini stub: each call shifts a reply off `replies` (default: success). Requests are recorded.
let calls = [], replies = [], fabricOk = true, geminiDelayMs = 0, unexpected = [];
const ok = () => ({ status: 200, body: { id: "v1_test", object: "interaction", status: "completed", steps: [{ type: "model_output", content: [{ type: "text", text: "Here is the preview." }, { type: "image", mime_type: "image/png", data: OUT_PNG.toString("base64") }] }], usage: { total_tokens: 3000 } } });

before(async () => {
  env = await startTestEnv();
  Object.assign(process.env, { TRYON_PROVIDER: "gemini", GEMINI_API_KEY: FAKE_KEY, TRYON_TIMEOUT_MS: "5000", TRYON_DAILY_LIMIT_PER_CLIENT: "5", TRYON_DAILY_LIMIT_TOTAL: "1000", TRYON_MONTHLY_LIMIT_TOTAL: "300" });
  delete process.env.TRYON_MOCK_TEST_HOOKS;
  PERSON = await jpeg(600, 900);
  FABRIC = await jpeg(500, 500, { r: 200, g: 30, b: 90 });
  OUT_PNG = await sharp({ create: { width: 683, height: 1024, channels: 3, background: { r: 200, g: 40, b: 100 } } }).png().toBuffer();
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith("https://res.cloudinary.com/")) return fabricOk ? new Response(FABRIC, { status: 200, headers: { "content-type": "image/jpeg" } }) : new Response("gone", { status: 404 });
    if (u === GEMINI) {
      calls.push({ headers: new Headers(init.headers), body: JSON.parse(init.body) });
      if (geminiDelayMs) await new Promise((res, rej) => { // honours the abort signal like real fetch
        const t = setTimeout(res, geminiDelayMs);
        init.signal?.addEventListener("abort", () => { clearTimeout(t); rej(init.signal.reason ?? new DOMException("aborted", "AbortError")); }, { once: true });
      });
      const r = replies.length ? replies.shift() : ok();
      return new Response(JSON.stringify(r.body), { status: r.status, headers: { "content-type": "application/json" } });
    }
    unexpected.push(u);
    return new Response("blocked in tests", { status: 599 });
  };
  ({ default: Suit, nextSku } = await import("../src/models/UnstitchedSuit.ts"));
  ({ default: Job } = await import("../src/models/TryOnJob.ts"));
  ({ default: Asset } = await import("../src/models/TryOnAsset.ts"));
  ({ default: Usage } = await import("../src/models/TryOnUsage.ts"));
  R.create = await import("../src/app/api/try-on/route.ts");
  R.one = await import("../src/app/api/try-on/[id]/route.ts");
  R.result = await import("../src/app/api/try-on/[id]/result/route.ts");
  R.config = await import("../src/app/api/try-on/config/route.ts");
  S = await import("../src/lib/tryOn/service.ts");
  STY = await import("../src/lib/tryOn/styles.ts");
});
after(async () => {
  await new Promise((x) => setTimeout(x, 300)); // let background jobs settle before the DB stops
  globalThis.fetch = realFetch;
  await env?.stop();
});
beforeEach(async () => {
  await env.reset();
  calls = []; replies = []; fabricOk = true; geminiDelayMs = 0; unexpected = [];
  process.env.TRYON_MONTHLY_LIMIT_TOTAL = "300";
  process.env.TRYON_TIMEOUT_MS = "5000";
});

const mkSuit = async (over = {}) => Suit.create({ sku: await nextSku(), name: "Rose Pink Chanderi", fabric: "Chanderi", color: "Rose pink", originalPricePaise: 249900, salePricePaise: 199900, stock: 4, fabricImages: [{ url: "https://res.cloudinary.com/demo/image/upload/v1/sara-royal/f1.jpg", publicId: "x" }], status: "published", ...over });

// `client` simulates the caller: the website (browser: same-origin Origin header) or the mobile app (no Origin).
async function post(fields, { ipAddr = ip(), client = "app", files = {} } = {}) {
  const { NextRequest } = await import("next/server");
  const fd = new FormData();
  const base = { consent: "true", adult: "true", consentVersion: STY.TRYON_CONSENT_VERSION, style: "anarkali", ...fields };
  for (const [k, v] of Object.entries(base)) if (v !== undefined) fd.set(k, v);
  const f = { person: { bytes: PERSON, type: "image/jpeg", name: "me.jpg" }, ...files };
  for (const [k, v] of Object.entries(f)) if (v) fd.set(k, new File([v.bytes], v.name ?? `${k}.jpg`, { type: v.type }));
  const headers = { "x-forwarded-for": ipAddr, host: "localhost", ...(client === "web" ? { origin: "http://localhost" } : {}) };
  const res = await R.create.POST(new NextRequest("http://localhost/api/try-on", { method: "POST", body: fd, headers }));
  return { status: res.status, body: await res.json().catch(() => null) };
}
async function status(id, token) {
  const { NextRequest } = await import("next/server");
  const res = await R.one.GET(new NextRequest(`http://localhost/api/try-on/${id}`, { headers: { "x-forwarded-for": ip(), "x-tryon-token": token } }), ctx(id));
  return { status: res.status, body: await res.json().catch(() => null) };
}
async function waitDone(id, token, ms = 8000) {
  const end = Date.now() + ms;
  for (;;) {
    const r = await status(id, token);
    if (["succeeded", "failed", "expired"].includes(r.body?.data?.status) || Date.now() > end) return r;
    await new Promise((x) => setTimeout(x, 30));
  }
}
const monthCount = async () => (await Usage.findById(S.usageKeys("x", "gemini").month).lean())?.count ?? 0;

test("config: live Gemini is announced to both apps (mode live, processor named) without any secret; off without a key", async () => {
  let r = await (await R.config.GET()).json();
  assert.equal(r.data.enabled, true);
  assert.equal(r.data.mode, "live");
  assert.equal(r.data.processor, "Google Gemini");
  assert.equal(r.data.styles.length, 6);
  assert.ok(!JSON.stringify(r).includes(FAKE_KEY));
  delete process.env.GEMINI_API_KEY;
  r = await (await R.config.GET()).json();
  assert.deepEqual([r.data.enabled, r.data.mode], [false, "off"]);
  assert.equal((await post({ suitId: String((await mkSuit())._id) })).status, 503);
  process.env.GEMINI_API_KEY = FAKE_KEY;
  process.env.TRYON_PROVIDER = "off";
  assert.equal((await (await R.config.GET()).json()).data.enabled, false);
  process.env.TRYON_PROVIDER = "gemini";
});

for (const client of ["web", "app"]) {
  test(`${client}: upload -> Gemini (mocked) -> private preview -> download -> delete; key only in a header; photos removed`, async () => {
    const suit = await mkSuit();
    const r = await post({ suitId: String(suit._id), style: "palazzo" }, { client });
    assert.equal(r.status, 202, JSON.stringify(r.body));
    const { id, token } = r.body.data;
    const done = await waitDone(id, token);
    assert.equal(done.body.data.status, "succeeded", JSON.stringify(done.body));
    // exactly one Gemini call with the right shape
    assert.equal(calls.length, 1);
    const call = calls[0];
    assert.equal(call.headers.get("x-goog-api-key"), FAKE_KEY);
    assert.equal(call.body.model, "gemini-nano-banana-2.1");
    assert.equal(call.body.store, false);
    assert.equal(call.body.response_format.image_size, "1K");
    assert.deepEqual(call.body.input.map((p) => p.type), ["text", "image", "image"], "prompt, customer photo, fabric");
    assert.match(call.body.input[0].text, /palazzo suit/);
    assert.ok(!JSON.stringify(call.body).includes(FAKE_KEY), "key never in the body");
    assert.deepEqual(unexpected, [], "no other external calls");
    // preview served privately, as JPEG (re-encoded from Gemini's PNG)
    const { NextRequest } = await import("next/server");
    const u = new URL(done.body.data.resultUrl + "&download=1", "http://localhost");
    const img = await R.result.GET(new NextRequest(u, { headers: { "x-forwarded-for": ip() } }), ctx(id));
    assert.equal(img.status, 200);
    assert.equal(img.headers.get("content-type"), "image/jpeg");
    assert.match(img.headers.get("cache-control"), /no-store/);
    assert.match(img.headers.get("content-disposition"), /^attachment/);
    assert.equal((await sharp(Buffer.from(await img.arrayBuffer())).metadata()).format, "jpeg");
    assert.equal(await Asset.countDocuments({ jobId: id, kind: { $in: ["person", "reference"] } }), 0, "customer photo deleted after generation");
    const job = await Job.findById(id).lean();
    assert.equal(job.provider, "gemini");
    assert.equal(job.active, undefined, "active flag cleared when finished");
    // delete now (website sends its same-origin Origin header; the app sends none)
    const del = await R.one.DELETE(new NextRequest(`http://localhost/api/try-on/${id}`, { method: "DELETE", headers: { "x-tryon-token": token, host: "localhost", ...(client === "web" ? { origin: "http://localhost" } : {}) } }), ctx(id));
    assert.equal(del.status, 200);
    assert.equal(await Asset.countDocuments({ jobId: id }), 0);
    assert.equal(await monthCount(), 1);
  });
}

test("custom reference style sends the reference as the third image; all six styles reach Gemini", async () => {
  const suit = await mkSuit();
  const r = await post({ suitId: String(suit._id), style: "custom" }, { files: { reference: { bytes: await jpeg(400, 600, { r: 10, g: 10, b: 90 }), type: "image/jpeg", name: "ref.jpg" } } });
  assert.equal((await waitDone(r.body.data.id, r.body.data.token)).body.data.status, "succeeded");
  assert.deepEqual(calls[0].body.input.map((p) => p.type), ["text", "image", "image", "image"]);
  assert.match(calls[0].body.input[0].text, /Image 3 is a reference photo/);
  for (const style of ["default", "straight", "anarkali", "palazzo", "patiala"]) {
    const x = await post({ suitId: String(suit._id), style });
    assert.equal((await waitDone(x.body.data.id, x.body.data.token)).body.data.status, "succeeded", style);
  }
  assert.equal(calls.length, 6);
});

test("errors: transient 503 retried once (counts twice), refusal/safety, bad key and timeout give friendly messages", async () => {
  const suit = await mkSuit();
  const run = async () => { const r = await post({ suitId: String(suit._id) }); return (await waitDone(r.body.data.id, r.body.data.token)).body.data; };
  process.env.TRYON_TIMEOUT_MS = "20000"; // a retry needs > 5 s of the time budget left
  replies = [{ status: 503, body: { error: { code: 503, status: "UNAVAILABLE", message: "overloaded" } } }];
  assert.equal((await run()).status, "succeeded");
  assert.equal(calls.length, 2, "one automatic retry");
  assert.equal(await monthCount(), 2, "the retry used its own unit of the monthly cap");

  replies = [{ status: 200, body: { status: "completed", steps: [{ type: "model_output", content: [{ type: "text", text: "I can't edit this image." }] }] } }];
  let d = await run();
  assert.deepEqual([d.status, d.errorCode], ["failed", "safety_blocked"]);
  assert.match(d.error, /different full-body photo/);

  replies = [{ status: 400, body: { error: { code: 400, status: "INVALID_ARGUMENT", message: "API key not valid. Please pass a valid API key." } } }];
  d = await run();
  assert.deepEqual([d.status, d.errorCode], ["failed", "unavailable"]);
  assert.ok(!/api key|gemini|google|INVALID/i.test(d.error), "no provider internals reach the customer");

  replies = [{ status: 429, body: { error: { status: "RESOURCE_EXHAUSTED" } } }, { status: 429, body: { error: { status: "RESOURCE_EXHAUSTED" } } }];
  d = await run();
  assert.deepEqual([d.status, d.errorCode], ["failed", "rate_limited"]);

  process.env.TRYON_TIMEOUT_MS = "6000";
  geminiDelayMs = 7000;
  const t0 = Date.now();
  d = await run();
  geminiDelayMs = 0;
  assert.deepEqual([d.status, d.errorCode], ["failed", "timeout"]);
  assert.ok(Date.now() - t0 < 7500);
  assert.equal(await Asset.countDocuments({ kind: { $in: ["person", "reference"] } }), 0, "inputs always deleted");
});

test("fabric photo unavailable: job fails before any Gemini call (nothing billed)", async () => {
  fabricOk = false;
  const suit = await mkSuit();
  const r = await post({ suitId: String(suit._id) });
  const d = (await waitDone(r.body.data.id, r.body.data.token)).body.data;
  assert.deepEqual([d.status, d.errorCode], ["failed", "fabric_unavailable"]);
  assert.equal(calls.length, 0);
});

test("monthly cap: refuses new previews once reached, and a retry is skipped when no unit is left", async () => {
  process.env.TRYON_MONTHLY_LIMIT_TOTAL = "2";
  const suit = await mkSuit();
  for (let i = 0; i < 2; i++) {
    const r = await post({ suitId: String(suit._id) });
    assert.equal(r.status, 202);
    await waitDone(r.body.data.id, r.body.data.token);
  }
  const third = await post({ suitId: String(suit._id) });
  assert.equal(third.status, 429);
  assert.match(third.body.message, /this month's limit/);
  assert.equal(calls.length, 2);
  assert.equal(await Job.countDocuments(), 2, "no job created when the cap is reached");
  // cap 3, one unit left: a transient failure is NOT retried because the retry would exceed the cap
  process.env.TRYON_MONTHLY_LIMIT_TOTAL = "3";
  process.env.TRYON_TIMEOUT_MS = "20000"; // enough time for a retry: only the cap can prevent it
  replies = [{ status: 503, body: {} }];
  const r = await post({ suitId: String(suit._id) });
  const d = (await waitDone(r.body.data.id, r.body.data.token)).body.data;
  assert.deepEqual([d.status, d.errorCode], ["failed", "unavailable"]);
  assert.equal(calls.length, 3);
  assert.equal(await monthCount(), 3);
});

test("concurrency: 12 simultaneous customers against a cap of 5 -> exactly 5 accepted, counter exactly 5", async () => {
  process.env.TRYON_MONTHLY_LIMIT_TOTAL = "5";
  geminiDelayMs = 200;
  const suit = await mkSuit();
  const results = await Promise.all(Array.from({ length: 12 }, () => post({ suitId: String(suit._id) })));
  const accepted = results.filter((r) => r.status === 202);
  assert.equal(accepted.length, 5, JSON.stringify(results.map((r) => r.status)));
  assert.ok(results.filter((r) => r.status !== 202).every((r) => r.status === 429 && /this month's limit/.test(r.body.message)));
  assert.equal(await monthCount(), 5);
  assert.equal(await Job.countDocuments(), 5);
  await Promise.all(accepted.map((r) => waitDone(r.body.data.id, r.body.data.token)));
});

test("concurrency: one customer firing 4 requests at once gets exactly one job; refused requests use no quota", async () => {
  geminiDelayMs = 300;
  const suit = await mkSuit();
  const me = "10.88.0.1";
  const results = await Promise.all(Array.from({ length: 4 }, () => post({ suitId: String(suit._id) }, { ipAddr: me })));
  const accepted = results.filter((r) => r.status === 202);
  assert.equal(accepted.length, 1, JSON.stringify(results.map((r) => [r.status, r.body?.message])));
  assert.ok(results.filter((r) => r.status !== 202).every((r) => r.status === 429 && /still being created/.test(r.body.message)));
  const hash = (await Job.findOne().lean()).clientHash;
  assert.equal((await Usage.findById(S.usageKeys(hash, "gemini").client).lean()).count, 1, "per-customer daily unit taken once");
  assert.equal(await monthCount(), 1);
  // the partial unique index is what makes this race-proof
  assert.ok((await Job.collection.indexes()).some((i) => i.name === "one_active_job_per_client" && i.unique && i.partialFilterExpression?.active === true));
  await waitDone(accepted[0].body.data.id, accepted[0].body.data.token);
});

test("abandoned active job (server restarted mid-job) stops blocking the customer after the timeout", async () => {
  const suit = await mkSuit();
  const me = "10.89.0.1";
  const a = await post({ suitId: String(suit._id) }, { ipAddr: me });
  await waitDone(a.body.data.id, a.body.data.token);
  const hash = (await Job.findById(a.body.data.id).lean()).clientHash;
  await Job.create({ suitId: suit._id, suitName: "x", style: "default", provider: "gemini", consentAt: new Date(), consentVersion: "v", clientHash: hash, tokenHash: "stale", status: "processing", active: true, expiresAt: new Date(Date.now() + 3600_000), createdAt: new Date(Date.now() - 10 * 60_000) });
  await Job.updateOne({ tokenHash: "stale" }, { $set: { createdAt: new Date(Date.now() - 10 * 60_000) } }, { timestamps: false });
  const { resetRateLimit } = await import("../src/lib/rateLimit.ts");
  resetRateLimit(`tryon:${me}`);
  const b = await post({ suitId: String(suit._id) }, { ipAddr: me });
  assert.equal(b.status, 202, JSON.stringify(b.body));
  assert.equal((await Job.findOne({ tokenHash: "stale" }).lean()).status, "failed");
  await waitDone(b.body.data.id, b.body.data.token);
});
