import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { startTestEnv, makeReq, json } from "./helpers/testEnv.mjs";

let env, Admin, Suit, Product, Settings, Uploaded, Audit, signAdminToken, cloud, R = {};
const calls = []; // Cloudinary destroy() calls (stubbed: no network)
const CRON = "cron-secret-for-tests-0123456789abcdef";
const u = (n) => `https://res.cloudinary.com/demo/image/upload/v1/sara-royal/m-${n}.jpg`;
const ctx = (id) => ({ params: Promise.resolve({ id }) });

before(async () => {
  env = await startTestEnv();
  Object.assign(process.env, { CLOUDINARY_CLOUD_NAME: "demo", CLOUDINARY_API_KEY: "key", CLOUDINARY_API_SECRET: "secret", CRON_SECRET: CRON });
  ({ default: Admin } = await import("../src/models/Admin.js"));
  ({ default: Suit } = await import("../src/models/UnstitchedSuit.ts"));
  ({ default: Product } = await import("../src/models/Product.js"));
  ({ default: Settings } = await import("../src/models/SiteSettings.ts"));
  ({ default: Uploaded } = await import("../src/models/UploadedAsset.ts"));
  ({ default: Audit } = await import("../src/models/AuditLog.ts"));
  ({ signAdminToken } = await import("../src/lib/auth/session.ts"));
  ({ cloudinary: cloud } = await import("../src/lib/cloudinary.ts"));
  cloud.uploader.destroy = async (id) => { calls.push(id); return { result: "ok" }; };
  let n = 0;
  cloud.uploader.upload_stream = (_opts, cb) => ({ end: () => cb(null, { secure_url: u(`up-${++n}`) }) });
  R.suit = await import("../src/app/api/admin/suits/[id]/route.ts");
  R.cleanup = await import("../src/app/api/admin/maintenance/cleanup-uploads/route.ts");
  R.upload = await import("../src/app/api/upload/route.ts");
  R.seed = await import("../src/app/api/seed/route.ts");
  R.dseed = await import("../src/app/api/design-studio/seed/route.ts");
  R.guard = await import("../src/lib/seedGuard.ts");
});
after(() => env?.stop());
beforeEach(async () => { await env.reset(); calls.length = 0; });

const user = async (role, permissions = {}) => {
  const a = await Admin.create({ name: role, email: `${role}${Math.random().toString(36).slice(2, 7)}@t.local`, password: await bcrypt.hash("x-not-used-1234", 4), role, permissions });
  return signAdminToken({ id: String(a._id), email: a.email, role: role === "staff" ? "staff" : "owner" });
};
let skuN = 0;
const mk = (images, over = {}) => Suit.create({ sku: `SR-${String(++skuN).padStart(4, "0")}`, name: "S", originalPricePaise: 1000, salePricePaise: 1000, stock: 1, fabricImages: images.map((i) => ({ url: u(i), publicId: `sara-royal/m-${i}` })), ...over });
const putImages = async (t, s, imgs) => json(await R.suit.PUT(await makeReq(`/api/admin/suits/${s._id}`, { method: "PUT", token: t, body: { fabricImages: imgs.map(u) } }), ctx(String(s._id))));
const delSuit = async (t, s) => json(await R.suit.DELETE(await makeReq(`/api/admin/suits/${s._id}?confirm=true`, { method: "DELETE", token: t }), ctx(String(s._id))));

test("removing an image from a suit deletes it from Cloudinary only when nothing else uses it", async () => {
  const t = await user("owner");
  const a = await mk([1, 2, 3]);
  const b = await mk([2]);                       // shares image 2
  await Product.create({ name: "P", description: "d", stitchingPrice: 1, categoryId: "c", imageUrl: u(3), imageUrls: [u(3)] }); // image 3 used by a stitching product
  await Settings.create({ key: "main", logo: { url: u(4), publicId: "sara-royal/m-4" } });
  await Suit.updateOne({ _id: a._id }, { $push: { fabricImages: { url: u(4), publicId: "sara-royal/m-4" } } }); // image 4 is also the invoice logo
  await Suit.updateOne({ _id: a._id }, { $push: { fabricImages: { url: u(5), publicId: "sara-royal/m-5" } } }); // image 5 is exclusively this suit's

  const r = await putImages(t, a, [1]); // drop 2,3,4,5
  assert.equal(r.status, 200);
  assert.deepEqual(calls.sort(), ["sara-royal/m-5"]); // 2 shared with suit b, 3 used by a product, 4 is the logo: all kept
  calls.length = 0;
  assert.equal((await delSuit(t, b)).status, 200); // image 2 now unreferenced by anyone else -> deleted with the suit
  assert.deepEqual(calls, ["sara-royal/m-2"]);
});

test("deleting a suit never removes an image still used by another suit", async () => {
  const t = await user("owner");
  const a = await mk([1, 2]);
  await mk([2]);
  assert.equal((await delSuit(t, a)).status, 200);
  assert.deepEqual(calls, ["sara-royal/m-1"]);
});

test("only files inside our upload folder are ever deleted", async () => {
  const t = await user("owner");
  const odd = { url: "https://res.cloudinary.com/demo/image/upload/v1/other-folder/x.jpg", publicId: "other-folder/x" };
  const a = await Suit.create({ sku: "SR-9001", name: "S", originalPricePaise: 1, salePricePaise: 1, fabricImages: [odd, { url: u(1), publicId: "sara-royal/m-1" }] });
  await putImages(t, a, [1]);
  assert.deepEqual(calls, []); // other-folder/x is not ours
});

test("upload route records every upload for later cleanup", async () => {
  const t = await user("staff", { products: true });
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
  const fd = new FormData(); fd.append("files", new File([png], "a.png", { type: "image/png" })); fd.append("files", new File([png], "b.png", { type: "image/png" }));
  const res = await R.upload.POST(new NextRequest("http://localhost/api/upload", { method: "POST", body: fd, headers: { cookie: `admin_session=${t}`, "x-forwarded-for": "10.2.2.2" } }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.urls.length, 2);
  assert.equal(await Uploaded.countDocuments(), 2);
  assert.ok((await Uploaded.findOne({ url: body.data.urls[0] }).lean()).publicId.startsWith("sara-royal/"));
});

const cleanup = async ({ token, secret, dry = false } = {}) => {
  const headers = { "x-forwarded-for": "10.3.3.3" };
  if (token) headers.cookie = `admin_session=${token}`;
  if (secret) headers["x-cron-secret"] = secret;
  return json(await R.cleanup.POST(new NextRequest(`http://localhost/api/admin/maintenance/cleanup-uploads${dry ? "?dryRun=true" : ""}`, { method: "POST", headers })));
};
const old = (url) => Uploaded.create({ url, publicId: url.split("/upload/v1/")[1].replace(".jpg", ""), createdAt: new Date(Date.now() - 48 * 3600e3) });

test("cleanup: deletes old unreferenced uploads, keeps referenced and recent ones, dry-run changes nothing", async () => {
  const owner = await user("owner");
  await old(u("orphan-1")); await old(u("orphan-2"));
  await old(u("used-by-suit")); await mk(["used-by-suit"]);
  await old(u("used-by-product")); await Product.create({ name: "P", description: "d", stitchingPrice: 1, categoryId: "c", imageUrl: u("used-by-product") });
  await Uploaded.create({ url: u("fresh-orphan"), publicId: "sara-royal/m-fresh-orphan" }); // uploaded just now: inside the 24h grace period
  const dry = await cleanup({ token: owner, dry: true });
  assert.deepEqual([dry.status, dry.body.data.dryRun, dry.body.data.wouldDelete, dry.body.data.stillInUse], [200, true, 2, 2]);
  assert.deepEqual(calls, []);
  assert.equal(await Uploaded.countDocuments(), 5);

  const real = await cleanup({ token: owner });
  assert.deepEqual([real.body.data.deleted, real.body.data.stillInUse, real.body.data.failed], [2, 2, 0]);
  assert.deepEqual(calls.sort(), ["sara-royal/m-orphan-1", "sara-royal/m-orphan-2"]);
  assert.equal(await Uploaded.countDocuments(), 1); // only the fresh one is still tracked
  assert.ok(await Uploaded.findOne({ url: u("fresh-orphan") }));
  assert.equal(await Audit.countDocuments({ action: "maintenance.cleanup_uploads" }), 1);
  assert.deepEqual((await cleanup({ token: owner })).body.data.deleted, 0); // idempotent
});

test("cleanup: auth — owner or CRON_SECRET only", async () => {
  await old(u("orphan-x"));
  assert.equal((await cleanup()).status, 401);
  assert.equal((await cleanup({ token: await user("staff", { products: true, orders: true, stock: true, returns: true, reports: true }) })).status, 403);
  assert.equal((await cleanup({ secret: "wrong-secret-wrong-secret-0000" })).status, 401);
  assert.equal((await cleanup({ secret: "x" })).status, 401);
  assert.equal(calls.length, 0);
  const ok = await cleanup({ secret: CRON });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.deleted, 1);
  // a short/unset secret never authorises
  const saved = process.env.CRON_SECRET; process.env.CRON_SECRET = "short";
  assert.equal((await cleanup({ secret: "short" })).status, 401);
  process.env.CRON_SECRET = saved;
});

test("seed guard: sample-data seeding is refused in production unless ALLOW_SEED=true", async () => {
  const owner = await user("owner");
  const saved = { env: process.env.NODE_ENV, allow: process.env.ALLOW_SEED };
  const call = async (route, token) => (await route.POST(await makeReq("/api/seed", { method: "POST", token }))).status;
  try {
    process.env.NODE_ENV = "production"; delete process.env.ALLOW_SEED;
    assert.equal(R.guard.seedAllowed(), false);
    assert.equal(await call(R.seed, owner), 403);
    assert.equal(await call(R.dseed, owner), 403);
    assert.equal(await call(R.seed, undefined), 401); // still needs auth first
    process.env.ALLOW_SEED = "true";
    assert.equal(R.guard.seedAllowed(), true);
    process.env.ALLOW_SEED = "yes";
    assert.equal(R.guard.seedAllowed(), false); // only the exact value enables it
    process.env.NODE_ENV = "development"; delete process.env.ALLOW_SEED;
    assert.equal(R.guard.seedAllowed(), true);
  } finally {
    process.env.NODE_ENV = saved.env; if (saved.allow === undefined) delete process.env.ALLOW_SEED; else process.env.ALLOW_SEED = saved.allow;
  }
});
