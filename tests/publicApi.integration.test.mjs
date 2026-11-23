import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { startTestEnv, makeReq, json } from "./helpers/testEnv.mjs";

let env, Suit, Category, nextSku, R = {};
const u = (n) => `https://res.cloudinary.com/demo/image/upload/v1/sara-royal/p-${n}.jpg`;
const ctx = (id) => ({ params: Promise.resolve({ id }) });
let ipN = 0;
const ip = () => `10.5.${Math.floor(++ipN / 250)}.${ipN % 250}`;

before(async () => {
  env = await startTestEnv();
  ({ default: Suit, nextSku } = await import("../src/models/UnstitchedSuit.ts"));
  ({ default: Category } = await import("../src/models/SuitCategory.ts"));
  R.list = await import("../src/app/api/suits/route.ts");
  R.one = await import("../src/app/api/suits/[id]/route.ts");
  R.val = await import("../src/app/api/suit-cart/validate/route.ts");
  R.cats = await import("../src/app/api/suit-categories/route.ts");
});
after(() => env?.stop());
beforeEach(() => env.reset());

const mk = async (over = {}) => Suit.create({ sku: await nextSku(), name: "S", originalPricePaise: 200000, salePricePaise: 150000, stock: 5, fabricImages: [{ url: u(1), publicId: "x" }], status: "published", ...over });
const list = async (qs = "") => json(await R.list.GET(await makeReq(`/api/suits${qs}`, { ip: ip() })));
const one = async (id) => json(await R.one.GET(await makeReq(`/api/suits/${id}`, { ip: ip() }), ctx(id)));
const validate = async (items) => json(await R.val.POST(await makeReq("/api/suit-cart/validate", { method: "POST", body: { items }, ip: ip() })));

test("visibility: draft and archived suits are invisible in the list AND by direct id/SKU", async () => {
  const pub = await mk({ name: "Published" });
  const draft = await mk({ name: "Draft", status: "draft" });
  const arch = await mk({ name: "Archived", status: "archived" });
  assert.deepEqual((await list()).body.data.items.map((i) => i.name), ["Published"]);
  assert.equal((await one(String(pub._id))).status, 200);
  assert.equal((await one(pub.sku)).status, 200); // SKU lookup
  assert.equal((await one(pub.sku.toLowerCase())).status, 200);
  for (const s of [draft, arch]) {
    assert.equal((await one(String(s._id))).status, 404);
    assert.equal((await one(s.sku)).status, 404);
  }
  assert.equal((await list(`?q=${draft.sku}`)).body.data.total, 0);
  assert.equal((await one("507f1f77bcf86cd799439011")).status, 404);
  assert.equal((await one("nonsense")).status, 404);
});

test("public data contains no admin-only fields", async () => {
  const s = await mk({ description: "d", details: "x", stock: 2 });
  const item = (await list()).body.data.items[0];
  const detail = (await one(String(s._id))).body.data;
  const all = JSON.stringify([item, detail]);
  for (const forbidden of ["publicId", "status", "low_stock", "stockState", "__v", "updatedAt"]) assert.ok(!all.includes(forbidden), forbidden);
  assert.equal(item.inStock, true);
  assert.equal(item.maxQuantity, 2);
  assert.equal(detail.description, "d");
});

test("zero-stock published suit stays visible but flagged out of stock", async () => {
  await mk({ stock: 0 });
  const item = (await list()).body.data.items[0];
  assert.deepEqual([item.inStock, item.maxQuantity], [false, 0]);
});

test("discount appears only when the sale price is lower", async () => {
  await mk({ name: "Sale", originalPricePaise: 200000, salePricePaise: 150000 });
  await mk({ name: "Full", originalPricePaise: 100000, salePricePaise: 100000 });
  const byName = Object.fromEntries((await list()).body.data.items.map((i) => [i.name, i]));
  assert.equal(byName.Sale.discountPercent, 25);
  assert.equal(byName.Full.discountPercent, 0);
});

test("a suit in several categories appears exactly once; category filter by slug and id; inactive categories hidden", async () => {
  const a = await Category.create({ name: "A", slug: "a" });
  const b = await Category.create({ name: "B", slug: "b" });
  const off = await Category.create({ name: "Off", slug: "off", active: false });
  const s = await mk({ name: "Multi", categoryIds: [a._id, b._id, off._id] });
  await mk({ name: "Other" });
  assert.equal((await list()).body.data.items.filter((i) => i.name === "Multi").length, 1);
  assert.deepEqual((await list("?category=a")).body.data.items.map((i) => i.name), ["Multi"]);
  assert.deepEqual((await list("?category=b")).body.data.items.map((i) => i.name), ["Multi"]);
  assert.deepEqual((await list(`?category=${b._id}`)).body.data.items.map((i) => i.name), ["Multi"]);
  assert.equal((await list("?category=off")).body.data.total, 0); // inactive category cannot be browsed
  assert.equal((await list("?category=missing")).body.data.total, 0);
  const cats = (await list()).body.data.items.find((i) => i.name === "Multi").categories.map((c) => c.slug).sort();
  assert.deepEqual(cats, ["a", "b"]); // inactive category not exposed
  assert.deepEqual((await json(await R.cats.GET())).body.data.map((c) => c.slug).sort(), ["a", "b"]);
  assert.equal(String(s._id).length, 24);
});

test("search (name/SKU), sorting, combined filters and pagination", async () => {
  const c = await Category.create({ name: "C", slug: "c" });
  const mkp = (name, price, extra = {}) => mk({ name, originalPricePaise: price, salePricePaise: price, ...extra });
  const a = await mkp("Alpha Cotton", 100000, { categoryIds: [c._id] });
  await mkp("Beta Silk", 300000, { categoryIds: [c._id] });
  await mkp("Gamma Linen (Special)", 200000);
  const names = async (qs) => (await list(qs)).body.data.items.map((i) => i.name);
  assert.deepEqual(await names("?sort=price_asc"), ["Alpha Cotton", "Gamma Linen (Special)", "Beta Silk"]);
  assert.deepEqual(await names("?sort=price_desc"), ["Beta Silk", "Gamma Linen (Special)", "Alpha Cotton"]);
  assert.deepEqual(await names("?sort=newest"), ["Gamma Linen (Special)", "Beta Silk", "Alpha Cotton"]);
  assert.deepEqual(await names("?q=silk"), ["Beta Silk"]);
  assert.deepEqual(await names(`?q=${a.sku}`), ["Alpha Cotton"]);
  assert.deepEqual(await names("?q=(special)"), ["Gamma Linen (Special)"]);
  assert.equal((await list("?q=.*")).body.data.total, 0);
  assert.deepEqual(await names("?category=c&sort=price_desc&q=a"), ["Beta Silk", "Alpha Cotton"]); // combined
  assert.equal((await list("?sort=bogus")).status, 400);
  const p = (await list("?limit=2&page=2&sort=price_asc")).body.data;
  assert.deepEqual([p.items.length, p.total, p.pages, p.page], [1, 3, 2, 2]);
  assert.equal((await list("?limit=1000")).body.data.limit, 48); // capped
});

test("featured filter returns only admin-selected suits; new arrivals = newest published", async () => {
  await mk({ name: "Plain" });
  await mk({ name: "Star", featured: true });
  await mk({ name: "HiddenStar", featured: true, status: "draft" });
  assert.deepEqual((await list("?featured=true")).body.data.items.map((i) => i.name), ["Star"]);
  assert.deepEqual((await list("?sort=newest&limit=1")).body.data.items.map((i) => i.name), ["Star"]);
});

test("detail: separate fabric and reference galleries; related suits share a category and exclude drafts", async () => {
  const c = await Category.create({ name: "C", slug: "c" });
  const main = await mk({ name: "Main", categoryIds: [c._id], referenceImages: [{ url: u(9), publicId: "r" }] });
  await mk({ name: "Rel1", categoryIds: [c._id] });
  await mk({ name: "RelDraft", categoryIds: [c._id], status: "draft" });
  await mk({ name: "Unrelated" });
  const d = (await one(String(main._id))).body.data;
  assert.deepEqual(d.fabricImages, [u(1)]);
  assert.deepEqual(d.referenceImages, [u(9)]);
  assert.deepEqual(d.related.map((r) => r.name), ["Rel1"]);
});

test("cart validation: price, stock, published status; read-only", async () => {
  const ok = await mk({ name: "Ok", stock: 3 });
  const out = await mk({ name: "Out", stock: 0 });
  const draft = await mk({ name: "Draft", status: "draft" });
  const r = (await validate([{ id: String(ok._id), quantity: 2 }, { id: String(out._id), quantity: 1 }, { id: String(draft._id), quantity: 1 }, { id: "507f1f77bcf86cd799439011", quantity: 1 }])).body.data;
  assert.deepEqual(r.items.map((i) => i.issue ?? "ok"), ["ok", "out_of_stock", "unavailable", "not_found"]);
  assert.equal(r.canCheckout, false);
  assert.equal(r.items[0].lineTotalPaise, 300000);
  assert.equal((await validate([{ id: String(ok._id), quantity: 4 }])).body.data.items[0].issue, "insufficient_stock");
  const good = (await validate([{ id: String(ok._id), quantity: 3 }])).body.data;
  assert.deepEqual([good.canCheckout, good.subtotalPaise], [true, 450000]);
  assert.equal((await Suit.findById(ok._id).lean()).stock, 3); // nothing reserved or deducted
  // price changes are picked up
  await Suit.updateOne({ _id: ok._id }, { $set: { salePricePaise: 120000 } });
  assert.equal((await validate([{ id: String(ok._id), quantity: 1 }])).body.data.items[0].unitPricePaise, 120000);
});

test("cart validation: malformed input is rejected", async () => {
  const s = await mk();
  const id = String(s._id);
  for (const bad of [[], "x", [{ id: "bad", quantity: 1 }], [{ id, quantity: 0 }], [{ id, quantity: 1.5 }], [{ id, quantity: 1000 }], [{ id, quantity: "2" }], [{ id, quantity: 1 }, { id, quantity: 1 }], Array.from({ length: 51 }, (_, i) => ({ id: String(i).padStart(24, "a"), quantity: 1 }))]) {
    assert.equal((await validate(bad)).status, 400, JSON.stringify(bad).slice(0, 60));
  }
});

test("public APIs are rate limited", async () => {
  await mk();
  const one_ip = "10.99.99.99";
  let last;
  for (let i = 0; i < 125; i++) last = await R.list.GET(await makeReq("/api/suits", { ip: one_ip }));
  assert.equal(last.status, 429);
});
