// AI Try-On backend with the LOCAL MOCK provider only (no external AI service, no network: fetch is stubbed).
import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { startTestEnv } from "./helpers/testEnv.mjs";

let env, Suit, Job, Asset, nextSku, R = {}, S, CFG, IMG, STY, PROMPT;
const realFetch = globalThis.fetch;
const ctx = (id) => ({ params: Promise.resolve({ id }) });
let ipN = 0;
const ip = () => `10.9.${Math.floor(++ipN / 250)}.${ipN % 250}`;
const jpeg = (w, h, color = { r: 120, g: 80, b: 60 }) => sharp({ create: { width: w, height: h, channels: 3, background: color } }).jpeg().toBuffer();
let PERSON, FABRIC;

before(async () => {
  env = await startTestEnv();
  Object.assign(process.env, { TRYON_PROVIDER: "mock", TRYON_MOCK_DELAY_MS: "30", TRYON_MOCK_TEST_HOOKS: "true", TRYON_TIMEOUT_MS: "5000", TRYON_DAILY_LIMIT_PER_CLIENT: "3", TRYON_DAILY_LIMIT_TOTAL: "1000" });
  PERSON = await jpeg(600, 900);
  FABRIC = await jpeg(500, 500, { r: 200, g: 30, b: 90 });
  globalThis.fetch = async (url) => (String(url).startsWith("https://res.cloudinary.com/") ? new Response(FABRIC, { status: 200, headers: { "content-type": "image/jpeg" } }) : new Response("no", { status: 404 }));
  ({ default: Suit, nextSku } = await import("../src/models/UnstitchedSuit.ts"));
  ({ default: Job } = await import("../src/models/TryOnJob.ts"));
  ({ default: Asset } = await import("../src/models/TryOnAsset.ts"));
  R.create = await import("../src/app/api/try-on/route.ts");
  R.one = await import("../src/app/api/try-on/[id]/route.ts");
  R.result = await import("../src/app/api/try-on/[id]/result/route.ts");
  R.config = await import("../src/app/api/try-on/config/route.ts");
  S = await import("../src/lib/tryOn/service.ts");
  CFG = await import("../src/lib/tryOn/config.ts");
  IMG = await import("../src/lib/tryOn/image.ts");
  STY = await import("../src/lib/tryOn/styles.ts");
  PROMPT = await import("../src/lib/tryOn/prompt.ts");
});
after(async () => { globalThis.fetch = realFetch; await env?.stop(); });
beforeEach(() => env.reset());

const mkSuit = async (over = {}) => Suit.create({ sku: await nextSku(), name: "Rose Pink Chanderi", fabric: "Chanderi", color: "Rose pink", originalPricePaise: 249900, salePricePaise: 199900, stock: 4, fabricImages: [{ url: "https://res.cloudinary.com/demo/image/upload/v1/sara-royal/f1.jpg", publicId: "x" }], status: "published", ...over });

async function post(fields, { ipAddr = ip(), headers = {}, files = {} } = {}) {
  const { NextRequest } = await import("next/server");
  const fd = new FormData();
  const base = { consent: "true", adult: "true", consentVersion: STY.TRYON_CONSENT_VERSION, style: "anarkali", ...fields };
  for (const [k, v] of Object.entries(base)) if (v !== undefined) fd.set(k, v);
  const f = { person: { bytes: PERSON, type: "image/jpeg", name: "me.jpg" }, ...files };
  for (const [k, v] of Object.entries(f)) if (v) fd.set(k, new File([v.bytes], v.name ?? `${k}.jpg`, { type: v.type }));
  const res = await R.create.POST(new NextRequest("http://localhost/api/try-on", { method: "POST", body: fd, headers: { "x-forwarded-for": ipAddr, host: "localhost", ...headers } }));
  return { status: res.status, body: await res.json().catch(() => null) };
}
async function status(id, token) {
  const { NextRequest } = await import("next/server");
  const h = { "x-forwarded-for": ip() };
  if (token) h["x-tryon-token"] = token;
  const res = await R.one.GET(new NextRequest(`http://localhost/api/try-on/${id}`, { headers: h }), ctx(id));
  return { status: res.status, body: await res.json().catch(() => null) };
}
async function result(path) {
  const { NextRequest } = await import("next/server");
  const u = new URL(path, "http://localhost");
  const id = u.pathname.split("/")[3];
  const res = await R.result.GET(new NextRequest(u.toString(), { headers: { "x-forwarded-for": ip() } }), ctx(id));
  return { status: res.status, type: res.headers.get("content-type"), cache: res.headers.get("cache-control"), bytes: Buffer.from(await res.arrayBuffer()) };
}
async function waitDone(id, token, ms = 8000) {
  const end = Date.now() + ms;
  for (;;) {
    const r = await status(id, token);
    if (["succeeded", "failed", "expired"].includes(r.body?.data?.status) || Date.now() > end) return r;
    await new Promise((x) => setTimeout(x, 40));
  }
}

test("config: public summary has styles/limits/disclaimer and no secrets; disabled without TRYON_PROVIDER", async () => {
  process.env.SOME_PROVIDER_API_KEY = "sk-test-should-never-appear-0123456789";
  let r = await (await R.config.GET()).json();
  assert.equal(r.data.enabled, true);
  assert.equal(r.data.mode, "mock");
  assert.deepEqual(r.data.styles.map((s) => s.key), ["default", "straight", "anarkali", "palazzo", "patiala", "custom"]);
  assert.equal(r.data.styles.find((s) => s.key === "custom").needsReference, true);
  assert.match(r.data.disclaimer, /AI-generated styling preview\. Actual stitching, colour, fit and appearance may vary\./);
  assert.ok(!JSON.stringify(r).includes("sk-test") && !JSON.stringify(r).includes(process.env.JWT_SECRET));
  process.env.TRYON_PROVIDER = "";
  r = await (await R.config.GET()).json();
  assert.equal(r.data.enabled, false);
  const suit = await mkSuit();
  assert.equal((await post({ suitId: String(suit._id) })).status, 503);
  process.env.TRYON_PROVIDER = "unknown-live-thing"; // unknown provider keeps the feature OFF (never guesses)
  assert.equal((await (await R.config.GET()).json()).data.enabled, false);
  process.env.TRYON_PROVIDER = "mock";
  delete process.env.SOME_PROVIDER_API_KEY;
});

test("validation: consent + 18+, style, suit visibility, reference for Custom style", async () => {
  const suit = await mkSuit();
  const id = String(suit._id);
  assert.equal((await post({ suitId: id, consent: undefined })).status, 400);
  assert.match((await post({ suitId: id, adult: "false" })).body.message, /18 or older/);
  assert.equal((await post({ suitId: id, consentVersion: "old" })).status, 409);
  assert.equal((await post({ suitId: id, style: "lehenga" })).status, 400);
  assert.match((await post({ suitId: id, style: "custom" })).body.message, /reference photo/);
  assert.equal((await post({ suitId: id }, { files: { person: null } })).status, 400);
  const draft = await mkSuit({ status: "draft" });
  assert.equal((await post({ suitId: String(draft._id) })).status, 404);
  assert.equal((await post({ suitId: "not-an-id" })).status, 400);
  assert.equal(await Job.countDocuments(), 0, "no job may be created for rejected requests");
});

test("image checks: type allow-list, real signature, size cap, minimum resolution, EXIF/GPS stripped", async () => {
  const id = String((await mkSuit())._id);
  const gif = await sharp({ create: { width: 500, height: 800, channels: 3, background: "#888" } }).gif().toBuffer();
  assert.match((await post({ suitId: id }, { files: { person: { bytes: gif, type: "image/gif" } } })).body.message, /JPG, PNG or WEBP/);
  assert.match((await post({ suitId: id }, { files: { person: { bytes: Buffer.from("this is not an image at all"), type: "image/jpeg" } } })).body.message, /not a valid JPEG/);
  const png = await sharp({ create: { width: 500, height: 800, channels: 3, background: "#888" } }).png().toBuffer();
  assert.match((await post({ suitId: id }, { files: { person: { bytes: png, type: "image/jpeg" } } })).body.message, /not a valid JPEG/);
  assert.match((await post({ suitId: id }, { files: { person: { bytes: await jpeg(300, 300), type: "image/jpeg" } } })).body.message, /too small/);
  const big = Buffer.concat([PERSON, Buffer.alloc(4 * 1024 * 1024)]);
  assert.match((await post({ suitId: id }, { files: { person: { bytes: big, type: "image/jpeg" } } })).body.message, /4 MB/);
  // normalisation: metadata removed, orientation applied, long side capped
  const withExif = await sharp({ create: { width: 2400, height: 3200, channels: 3, background: "#777" } }).withExif({ IFD0: { Make: "PhoneCo", Model: "X1" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "30/1 44/1 0/1" } }).jpeg().toBuffer();
  assert.ok((await sharp(withExif).metadata()).exif, "fixture has EXIF");
  const out = await IMG.normalizeCustomerImage({ type: "image/jpeg", size: withExif.length }, withExif, "Your photo", 400);
  const meta = await sharp(out.bytes).metadata();
  assert.equal(meta.exif, undefined, "EXIF (incl. GPS) must be stripped");
  assert.equal(Math.max(meta.width, meta.height), 1536);
});

test("happy path: 202 + token, mock generates, inputs deleted, signed private result, download, then delete", async () => {
  const suit = await mkSuit();
  const r = await post({ suitId: String(suit._id), style: "patiala" });
  assert.equal(r.status, 202, JSON.stringify(r.body));
  const { id, token } = r.body.data;
  assert.ok(id && token && token.length >= 30);
  const job = await Job.findById(id).lean();
  assert.notEqual(job.tokenHash, token, "token is stored only as a hash");
  assert.ok(!JSON.stringify(job).includes("10.9."), "raw IP is never stored");
  const done = await waitDone(id, token);
  assert.equal(done.body.data.status, "succeeded", JSON.stringify(done.body));
  assert.match(done.body.data.resultUrl, new RegExp(`^/api/try-on/${id}/result\\?exp=\\d{10}&sig=`));
  assert.equal(await Asset.countDocuments({ jobId: id, kind: { $in: ["person", "reference"] } }), 0, "customer photo deleted after generation");
  const img = await result(done.body.data.resultUrl);
  assert.equal(img.status, 200);
  assert.equal(img.type, "image/jpeg");
  assert.match(img.cache, /no-store/);
  assert.equal((await sharp(img.bytes).metadata()).format, "jpeg");
  // wrong / missing token and tampered or expired signatures never reveal anything
  assert.equal((await status(id, "x".repeat(32))).status, 404);
  assert.equal((await status(id, null)).status, 404);
  assert.equal((await result(done.body.data.resultUrl.replace(/sig=.{4}/, "sig=AAAA"))).status, 404);
  const past = Math.floor(Date.now() / 1000) - 5;
  assert.equal((await result(`/api/try-on/${id}/result?exp=${past}&sig=${CFG.hmac(`${id}.${past}`)}`)).status, 404, "expired link refused");
  // customer deletes now
  const { NextRequest } = await import("next/server");
  const del = await R.one.DELETE(new NextRequest(`http://localhost/api/try-on/${id}`, { method: "DELETE", headers: { "x-tryon-token": token, host: "localhost" } }), ctx(id));
  assert.equal(del.status, 200);
  assert.equal(await Asset.countDocuments({ jobId: id }), 0);
  assert.equal((await result(done.body.data.resultUrl)).status, 404);
  assert.equal((await status(id, token)).status, 404);
});

test("custom reference style: both images accepted; reference deleted after generation", async () => {
  const suit = await mkSuit();
  const r = await post({ suitId: String(suit._id), style: "custom" }, { files: { reference: { bytes: await jpeg(400, 600, { r: 10, g: 10, b: 90 }), type: "image/jpeg", name: "ref.jpg" } } });
  assert.equal(r.status, 202, JSON.stringify(r.body));
  assert.equal((await Job.findById(r.body.data.id).lean()).hasReference, true);
  const done = await waitDone(r.body.data.id, r.body.data.token);
  assert.equal(done.body.data.status, "succeeded");
  assert.equal(await Asset.countDocuments({ jobId: r.body.data.id, kind: "reference" }), 0);
});

test("failures: provider error retried once then a friendly message; safety block; timeout; inputs always deleted", async () => {
  const suit = await mkSuit();
  for (const [outcome, code, re] of [["fail", "unavailable", /temporarily unavailable/], ["safety", "safety_blocked", /different full-body photo/]]) {
    const r = await post({ suitId: String(suit._id) }, { headers: { "x-tryon-mock-outcome": outcome } });
    const done = await waitDone(r.body.data.id, r.body.data.token);
    assert.equal(done.body.data.status, "failed");
    assert.equal(done.body.data.errorCode, code);
    assert.match(done.body.data.error, re);
    assert.ok(!/mock|stack|Error:/i.test(done.body.data.error), "no internals leak");
    const job = await Job.findById(r.body.data.id).lean();
    assert.equal(job.attempts, 1);
    assert.equal(await Asset.countDocuments({ jobId: r.body.data.id }), 0);
  }
  const t0 = Date.now();
  const r = await post({ suitId: String(suit._id) }, { headers: { "x-tryon-mock-outcome": "timeout" } });
  const done = await waitDone(r.body.data.id, r.body.data.token, 12000);
  assert.equal(done.body.data.status, "failed");
  assert.equal(done.body.data.errorCode, "timeout");
  assert.ok(Date.now() - t0 < 9000, "aborted at the configured timeout");
  assert.equal(await Asset.countDocuments({ jobId: r.body.data.id }), 0);
});

test("test hooks are ignored unless TRYON_MOCK_TEST_HOOKS=true", async () => {
  process.env.TRYON_MOCK_TEST_HOOKS = "false";
  const suit = await mkSuit();
  const r = await post({ suitId: String(suit._id) }, { headers: { "x-tryon-mock-outcome": "fail" } });
  assert.equal((await waitDone(r.body.data.id, r.body.data.token)).body.data.status, "succeeded");
  process.env.TRYON_MOCK_TEST_HOOKS = "true";
});

test("stuck jobs: processing past the timeout is marked failed; a queued job not picked up is restarted by polling", async () => {
  const suit = await mkSuit();
  const r = await post({ suitId: String(suit._id) }, { headers: { "x-tryon-mock-outcome": "timeout" } });
  await new Promise((x) => setTimeout(x, 100));
  await Job.updateOne({ _id: r.body.data.id }, { $set: { startedAt: new Date(Date.now() - 10 * 60_000) } });
  const s1 = await status(r.body.data.id, r.body.data.token);
  assert.equal(s1.body.data.status, "failed");
  assert.equal(s1.body.data.errorCode, "timeout");
  // queued + stale -> poll kicks processing
  const token = "t".repeat(32);
  const j = await Job.create({ suitId: suit._id, suitName: "x", style: "default", provider: "mock", consentAt: new Date(), consentVersion: "v", clientHash: "h", tokenHash: CFG.sha256(token), expiresAt: new Date(Date.now() + 3600_000), createdAt: new Date(Date.now() - 60_000) });
  await Job.updateOne({ _id: j._id }, { $set: { createdAt: new Date(Date.now() - 60_000) } }, { timestamps: false });
  await Asset.create({ jobId: j._id, kind: "person", contentType: "image/jpeg", bytes: PERSON, expiresAt: new Date(Date.now() + 600_000) });
  const done = await waitDone(String(j._id), token);
  assert.equal(done.body.data.status, "succeeded");
});

test("retention: expired results report 'expired' and are removed; sweep deletes expired jobs and assets", async () => {
  const suit = await mkSuit();
  const r = await post({ suitId: String(suit._id) });
  const done = await waitDone(r.body.data.id, r.body.data.token);
  assert.equal(done.body.data.status, "succeeded");
  await Job.updateOne({ _id: r.body.data.id }, { $set: { resultExpiresAt: new Date(Date.now() - 1000) } });
  const s = await status(r.body.data.id, r.body.data.token);
  assert.equal(s.body.data.status, "expired");
  assert.equal(await Asset.countDocuments({ jobId: r.body.data.id }), 0);
  await Job.updateOne({ _id: r.body.data.id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  await Asset.create({ jobId: r.body.data.id, kind: "result", contentType: "image/jpeg", bytes: PERSON, expiresAt: new Date(Date.now() - 1000) });
  await S.sweepExpired();
  assert.equal(await Job.countDocuments({ _id: r.body.data.id }), 0);
  assert.equal(await Asset.countDocuments(), 0);
  // TTL indexes exist on both collections
  for (const M of [Job, Asset]) assert.ok((await M.collection.indexes()).some((i) => i.key.expiresAt === 1 && i.expireAfterSeconds === 0));
});

test("abuse limits: one active job per client, daily per-client cap, burst limit, cross-site browser POST refused", async () => {
  const suit = await mkSuit();
  const id = String(suit._id);
  const me = "10.200.0.1";
  const a = await post({ suitId: id }, { ipAddr: me, headers: { "x-tryon-mock-outcome": "timeout" } });
  assert.equal(a.status, 202);
  const b = await post({ suitId: id }, { ipAddr: me });
  assert.equal(b.status, 429);
  assert.match(b.body.message, /still being created/);
  // the refused request did not use up a daily unit; two more previews today -> 3 in total = the daily cap
  await Job.updateMany({}, { $set: { status: "failed" }, $unset: { active: 1 } });
  const hash = (await Job.findOne({ _id: a.body.data.id }).lean()).clientHash;
  const key = S.usageKeys(hash, "mock").client;
  const Usage = (await import("../src/models/TryOnUsage.ts")).default;
  assert.equal((await Usage.findById(key).lean()).count, 1);
  await Usage.updateOne({ _id: key }, { $inc: { count: 2 } });
  const { resetRateLimit } = await import("../src/lib/rateLimit.ts");
  resetRateLimit(`tryon:${me}`); // isolate the DAILY cap from the short burst limiter
  const capped = await post({ suitId: id }, { ipAddr: me });
  assert.equal(capped.status, 429, JSON.stringify(capped.body));
  assert.match(capped.body.message, /limit of 3 previews/);
  // burst: the in-memory limiter blocks a 5th request within 10 minutes from one IP even before DB checks
  const other = "10.201.0.1";
  for (let i = 0; i < 4; i++) await post({ suitId: "bad" }, { ipAddr: other });
  assert.equal((await post({ suitId: id }, { ipAddr: other })).status, 429);
  // a browser on another site cannot POST (Origin present and foreign); the mobile app sends no Origin
  assert.equal((await post({ suitId: id }, { headers: { origin: "https://evil.example" } })).status, 403);
});

test("prompt: style-specific, identity-preserving, contains no customer data", () => {
  const p = PROMPT.buildTryOnPrompt(STY.styleByKey("anarkali"), { name: "Rose Pink", fabric: "Chanderi", color: "Rose pink" }, false);
  assert.match(p, /Anarkali/);
  assert.match(p, /UNSTITCHED/);
  assert.match(p, /face, identity, skin tone/);
  assert.match(p, /exact colours, print, pattern, border and embroidery/);
  assert.doesNotMatch(p, /Image 3/);
  assert.match(PROMPT.buildTryOnPrompt(STY.styleByKey("custom"), { name: "x" }, true), /Image 3 is a reference photo/);
  assert.equal(CFG.verifyResultSignature("abc", "9999999999", "bad"), false);
});
