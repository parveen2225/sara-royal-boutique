import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { startTestEnv, makeReq, json } from "./helpers/testEnv.mjs";

let env, Suit, Category, Counter, nextSku, signAdminToken, Admin;
let catRoute, catIdRoute;

before(async () => {
  env = await startTestEnv();
  ({ default: Suit, nextSku } = await import("../src/models/UnstitchedSuit.ts"));
  ({ default: Category } = await import("../src/models/SuitCategory.ts"));
  ({ default: Counter } = await import("../src/models/Counter.ts"));
  ({ default: Admin } = await import("../src/models/Admin.js"));
  ({ signAdminToken } = await import("../src/lib/auth/session.ts"));
  catRoute = await import("../src/app/api/admin/suit-categories/route.ts");
  catIdRoute = await import("../src/app/api/admin/suit-categories/[id]/route.ts");
});
after(() => env?.stop());
beforeEach(() => env.reset());

const img = (n = 1) => Array.from({ length: n }, (_, i) => ({ url: `https://res.cloudinary.com/x/image/upload/f${i}.jpg`, publicId: `f${i}` }));
const base = (over = {}) => ({ name: "Test Suit", originalPricePaise: 200000, salePricePaise: 150000, stock: 5, ...over });
const createSuit = async (over = {}) => Suit.create({ sku: await nextSku(), ...base(over) });

test("SKU: 60 concurrent reservations are unique, gap-free and correctly formatted", async () => {
  const skus = await Promise.all(Array.from({ length: 60 }, () => nextSku()));
  assert.equal(new Set(skus).size, 60);
  assert.ok(skus.every((s) => /^SR-\d{4,}$/.test(s)));
  assert.deepEqual([...skus].sort(), Array.from({ length: 60 }, (_, i) => `SR-${String(i + 1).padStart(4, "0")}`));
});

test("SKU: 40 concurrent suit creations produce 40 distinct suits and SKUs", async () => {
  await Promise.all(Array.from({ length: 40 }, (_, i) => createSuit({ name: `Suit ${i}` })));
  const all = await Suit.find().lean();
  assert.equal(all.length, 40);
  assert.equal(new Set(all.map((s) => s.sku)).size, 40);
});

test("SKU: deleted SKUs are never reused", async () => {
  const a = await createSuit();
  const b = await createSuit();
  assert.equal(a.sku, "SR-0001");
  await Suit.deleteMany({});
  assert.equal(await Counter.findById("suit-sku").then((c) => c.seq), 2);
  const c = await createSuit();
  assert.equal(c.sku, "SR-0003");
  assert.notEqual(c.sku, a.sku);
  assert.notEqual(c.sku, b.sku);
});

test("SKU: immutable on save and on update queries; duplicate SKU rejected", async () => {
  const s = await createSuit();
  const original = s.sku;
  s.sku = "SR-9999";
  await s.save();
  assert.equal((await Suit.findById(s._id).lean()).sku, original);
  await Suit.updateOne({ _id: s._id }, { $set: { sku: "SR-8888", name: "Renamed" } });
  const after = await Suit.findById(s._id).lean();
  assert.equal(after.sku, original);
  assert.equal(after.name, "Renamed");
  await assert.rejects(Suit.create({ sku: original, ...base() }), /duplicate key|E11000/);
});

test("validation: pricing, stock and status rules", async () => {
  const bad = async (over, re) => await assert.rejects(Suit.create({ sku: await nextSku(), ...base(over) }), re);
  await bad({ salePricePaise: 200001 }, /Sale price cannot exceed/);
  await bad({ originalPricePaise: -1 }, /originalPricePaise/);
  await bad({ stock: -1 }, /stock/);
  await bad({ stock: 1.5 }, /stock/);
  await bad({ originalPricePaise: 1999.5 }, /originalPricePaise/);
  await bad({ status: "live" }, /status/);
  await bad({ name: "" }, /name/);
  await bad({ name: "x".repeat(161) }, /name/);
  const ok = await createSuit({ salePricePaise: 200000 }); // sale == original is allowed
  assert.equal(ok.status, "draft"); // default
  assert.equal((await createSuit({ salePricePaise: 0 })).salePricePaise, 0); // free sale price is a valid nonnegative amount
});

test("publishing: needs ≥1 fabric image; image count limits enforced", async () => {
  await assert.rejects(Suit.create({ sku: await nextSku(), ...base({ status: "published" }) }), /at least one fabric image/);
  const s = await createSuit();
  s.status = "published";
  await assert.rejects(s.save(), /at least one fabric image/);
  s.fabricImages = img(1);
  await s.save();
  assert.equal((await Suit.findById(s._id).lean()).status, "published");
  await createSuit({ fabricImages: img(10) });
  await assert.rejects(createSuit({ fabricImages: img(11) }), /At most 10/);
  await createSuit({ fabricImages: img(1), referenceImages: img(5) });
  await assert.rejects(createSuit({ fabricImages: img(1), referenceImages: img(6) }), /At most 5/);
  const arch = await createSuit({ status: "archived" }); // archived/draft can have no images
  assert.equal(arch.status, "archived");
});

test("indexes: unique SKU and listing indexes exist", async () => {
  const idx = await Suit.collection.indexes();
  assert.ok(idx.some((i) => i.key.sku === 1 && i.unique));
  assert.ok(idx.some((i) => i.key.status === 1 && i.key.createdAt === -1));
  assert.ok(idx.some((i) => i.key.categoryIds === 1));
});

// ---- categories via the real route handlers
const ownerToken = async () => {
  const a = await Admin.create({ name: "O", email: "o@test.local", password: await bcrypt.hash("pw-not-used", 4), role: "owner" });
  return signAdminToken({ id: String(a._id), email: a.email, role: "owner" });
};
const ctx = (id) => ({ params: Promise.resolve({ id }) });

test("categories: create / duplicate / validation / stable slug on rename", async () => {
  const token = await ownerToken();
  const created = await json(await catRoute.POST(await makeReq("/api/admin/suit-categories", { method: "POST", token, body: { name: "Cotton Suits" } })));
  assert.equal(created.status, 201);
  assert.equal(created.body.data.slug, "cotton-suits");
  const dup = await json(await catRoute.POST(await makeReq("/api/admin/suit-categories", { method: "POST", token, body: { name: "cotton  suits" } })));
  assert.equal(dup.status, 409);
  assert.equal((await json(await catRoute.POST(await makeReq("/api/admin/suit-categories", { method: "POST", token, body: { name: "  " } })))).status, 400);
  assert.equal((await json(await catRoute.POST(await makeReq("/api/admin/suit-categories", { method: "POST", token, body: "[1]" })))).status, 400);
  const id = created.body.data.id;
  const renamed = await json(await catIdRoute.PUT(await makeReq(`/api/admin/suit-categories/${id}`, { method: "PUT", token, body: { name: "Pure Cotton" } }), ctx(id)));
  assert.equal(renamed.status, 200);
  assert.equal(renamed.body.data.slug, "cotton-suits"); // slug is stable
  assert.equal((await json(await catIdRoute.PUT(await makeReq("/api/admin/suit-categories/zzz", { method: "PUT", token, body: { name: "x" } }), ctx("zzz")))).status, 404);
});

test("categories: deleting an assigned category needs confirmation and only unlinks suits", async () => {
  const token = await ownerToken();
  const c1 = await Category.create({ name: "A", slug: "a" });
  const c2 = await Category.create({ name: "B", slug: "b" });
  const s1 = await createSuit({ categoryIds: [c1._id, c2._id], fabricImages: img(1), status: "published" });
  const s2 = await createSuit({ categoryIds: [c1._id] });
  const call = async (id, q = "") => json(await catIdRoute.DELETE(await makeReq(`/api/admin/suit-categories/${id}${q}`, { method: "DELETE", token }), ctx(id)));

  const blocked = await call(String(c1._id));
  assert.equal(blocked.status, 409);
  assert.ok(await Category.findById(c1._id));
  assert.equal((await Suit.findById(s2._id).lean()).categoryIds.length, 1);

  const ok = await call(String(c1._id), "?confirm=true");
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.suitsUpdated, 2);
  assert.equal(await Category.findById(c1._id), null);
  const s1After = await Suit.findById(s1._id).lean();
  assert.deepEqual(s1After.categoryIds.map(String), [String(c2._id)]);
  assert.equal(s1After.status, "published"); // suit itself untouched
  assert.equal((await Suit.findById(s2._id).lean()).categoryIds.length, 0);

  const unused = await Category.create({ name: "C", slug: "c" }); // unassigned: no confirmation needed
  assert.equal((await call(String(unused._id))).status, 200);
  assert.equal((await call(String(unused._id))).status, 404);
});

test("categories: list shows suit counts; one suit in several categories counts once per category", async () => {
  const token = await ownerToken();
  const c1 = await Category.create({ name: "A", slug: "a" });
  const c2 = await Category.create({ name: "B", slug: "b" });
  await createSuit({ categoryIds: [c1._id, c2._id] });
  const res = await json(await catRoute.GET(await makeReq("/api/admin/suit-categories", { token })));
  const counts = Object.fromEntries(res.body.data.map((c) => [c.slug, c.suitCount]));
  assert.deepEqual(counts, { a: 1, b: 1 });
});
