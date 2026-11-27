import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { startTestEnv, makeReq, json } from "./helpers/testEnv.mjs";
import { NextRequest } from "next/server";

let env, Admin, Suit, Category, Movement, Audit, signAdminToken, R = {};
const u = (n) => `https://res.cloudinary.com/demo/image/upload/v1700000000/sara-royal/img-${n}.jpg`;
const ctx = (id) => ({ params: Promise.resolve({ id }) });

before(async () => {
  env = await startTestEnv();
  ({ default: Admin } = await import("../src/models/Admin.js"));
  ({ default: Suit } = await import("../src/models/UnstitchedSuit.ts"));
  ({ default: Category } = await import("../src/models/SuitCategory.ts"));
  ({ default: Movement } = await import("../src/models/StockMovement.ts"));
  ({ default: Audit } = await import("../src/models/AuditLog.ts"));
  ({ signAdminToken } = await import("../src/lib/auth/session.ts"));
  R.list = await import("../src/app/api/admin/suits/route.ts");
  R.one = await import("../src/app/api/admin/suits/[id]/route.ts");
  R.status = await import("../src/app/api/admin/suits/[id]/status/route.ts");
  R.stock = await import("../src/app/api/admin/suits/[id]/stock/route.ts");
  R.upload = await import("../src/app/api/upload/route.ts");
});
after(() => env?.stop());
beforeEach(() => env.reset());

const user = async (role, permissions = {}) => {
  const a = await Admin.create({ name: role, email: `${role}${Math.random().toString(36).slice(2, 7)}@t.local`, password: await bcrypt.hash("x-not-used-1234", 4), role, permissions });
  return signAdminToken({ id: String(a._id), email: a.email, role: role === "staff" ? "staff" : "owner" });
};
const owner = () => user("owner");
const staffAll = () => user("staff", { products: true, stock: true });
const create = async (token, body) => json(await R.list.POST(await makeReq("/api/admin/suits", { method: "POST", token, body })));
const get = async (token, id) => json(await R.one.GET(await makeReq(`/api/admin/suits/${id}`, { token }), ctx(id)));
const put = async (token, id, body) => json(await R.one.PUT(await makeReq(`/api/admin/suits/${id}`, { method: "PUT", token, body }), ctx(id)));
const del = async (token, id, q = "") => json(await R.one.DELETE(await makeReq(`/api/admin/suits/${id}${q}`, { method: "DELETE", token }), ctx(id)));
const setStatus = async (token, id, status) => json(await R.status.POST(await makeReq(`/api/admin/suits/${id}/status`, { method: "POST", token, body: { status } }), ctx(id)));
const stock = async (token, id, body) => json(await R.stock.POST(await makeReq(`/api/admin/suits/${id}/stock`, { method: "POST", token, body }), ctx(id)));
const list = async (token, qs = "") => json(await R.list.GET(await makeReq(`/api/admin/suits${qs}`, { token })));
const base = (o = {}) => ({ name: "Rose Cotton", originalPrice: 2000, salePrice: 1500, ...o });

// ---------- create / read
test("create: draft by default, SKU assigned, paise stored, discount derived; SKUs increase", async () => {
  const t = await owner();
  const a = await create(t, base());
  assert.equal(a.status, 201);
  assert.equal(a.body.data.sku, "SR-0001");
  assert.equal(a.body.data.status, "draft");
  assert.equal(a.body.data.originalPricePaise, 200000);
  assert.equal(a.body.data.discountPercent, 25);
  assert.equal(a.body.data.stock, 0);
  assert.equal((await create(t, base())).body.data.sku, "SR-0002");
  assert.equal((await get(t, a.body.data.id)).body.data.sku, "SR-0001");
  assert.equal((await get(t, "zzz")).status, 404);
  assert.equal((await get(t, "507f1f77bcf86cd799439011")).status, 404);
});

test("create: invalid pricing / payloads are rejected and consume no SKU", async () => {
  const t = await owner();
  for (const bad of [{ name: "", originalPrice: 1 }, base({ salePrice: 2001 }), base({ originalPrice: -5 }), base({ originalPrice: "abc" }), base({ stock: -1 }), base({ status: "published" }), base({ categoryIds: ["507f1f77bcf86cd799439011"] }), base({ fabricImages: ["https://evil.com/a.jpg"] })]) {
    assert.equal((await create(t, bad)).status, 400, JSON.stringify(bad));
  }
  assert.equal((await create(t, base())).body.data.sku, "SR-0001");
});

test("create: sale price defaults to the original; zero discount shows 0", async () => {
  const t = await owner();
  const r = await create(t, { name: "Plain", originalPrice: 999 });
  assert.equal(r.body.data.salePrice, 999);
  assert.equal(r.body.data.discountPercent, 0);
});

// ---------- permissions on every new API
test("permissions: anonymous 401, staff without permission 403, on every new suit endpoint", async () => {
  const t = await owner();
  const id = (await create(t, base())).body.data.id;
  const none = await user("staff", {});
  const stockOnly = await user("staff", { stock: true });
  const productsOnly = await user("staff", { products: true });
  const probes = {
    list: (tok) => list(tok),
    create: (tok) => create(tok, base()),
    get: (tok) => get(tok, id),
    put: (tok) => put(tok, id, { name: "X" }),
    status: (tok) => setStatus(tok, id, "archived"),
    stockPost: (tok) => stock(tok, id, { mode: "adjust", quantity: 1, reason: "correction" }),
    stockGet: async (tok) => json(await R.stock.GET(await makeReq(`/api/admin/suits/${id}/stock`, { token: tok }), ctx(id))),
    delete: (tok) => del(tok, id, "?confirm=true"),
  };
  const need = { list: "products", create: "products", get: "products", put: "products", status: "products", stockPost: "stock", stockGet: "stock", delete: "owner" };
  for (const [name, call] of Object.entries(probes)) {
    assert.equal((await call(undefined)).status, 401, `${name} anonymous`);
    assert.equal((await call(none)).status, 403, `${name} no-permission staff`);
    if (need[name] === "products") assert.equal((await call(stockOnly)).status, 403, `${name} stock-only staff`);
    if (need[name] === "stock") assert.equal((await call(productsOnly)).status, 403, `${name} products-only staff`);
    if (need[name] === "owner") assert.equal((await call(await staffAll())).status, 403, `${name} fully-permitted staff`);
  }
  assert.ok((await Suit.findById(id)), "suit must still exist after refused delete");
});

test("permissions: staff with only 'products' cannot create a suit with initial stock", async () => {
  const productsOnly = await user("staff", { products: true });
  assert.equal((await create(productsOnly, base({ stock: 5 }))).status, 403);
  assert.equal((await create(productsOnly, base({ stock: 0 }))).status, 201);
  const both = await staffAll();
  const r = await create(both, base({ stock: 5 }));
  assert.equal(r.status, 201);
  const rows = await Movement.find({ suitId: r.body.data.id }).lean();
  assert.equal(rows.length, 1);
  assert.deepEqual([rows[0].previousQty, rows[0].change, rows[0].resultingQty, rows[0].reason], [0, 5, 5, "initial"]);
});

// ---------- update / pricing / images
test("update: pricing rules against stored values, SKU immutable, status/stock refused", async () => {
  const t = await owner();
  const s = (await create(t, base())).body.data;
  assert.equal((await put(t, s.id, { salePrice: 1800 })).body.data.discountPercent, 10);
  assert.equal((await put(t, s.id, { salePrice: 2500 })).status, 400);
  assert.equal((await put(t, s.id, { originalPrice: 1000 })).status, 400); // sale 1500 would exceed
  assert.equal((await put(t, s.id, { originalPrice: 3000, salePrice: 2500 })).status, 200);
  assert.equal((await put(t, s.id, { sku: "SR-9999" })).status, 400);
  assert.equal((await put(t, s.id, { status: "published" })).status, 400);
  assert.equal((await put(t, s.id, { stock: 50 })).status, 400);
  assert.equal((await put(t, s.id, {})).status, 400);
  assert.equal((await put(t, "507f1f77bcf86cd799439011", { name: "x" })).status, 404);
  assert.equal((await get(t, s.id)).body.data.sku, s.sku);
  assert.equal((await Audit.countDocuments({ action: "suit.updated" })), 2);
});

test("images: order is preserved and reorderable (first = cover); replace/remove; limits; no duplicates", async () => {
  const t = await owner();
  const s = (await create(t, base({ fabricImages: [u(1), u(2), u(3)], referenceImages: [u(10)] }))).body.data;
  assert.deepEqual(s.fabricImages.map((i) => i.url), [u(1), u(2), u(3)]);
  let r = await put(t, s.id, { fabricImages: [u(3), u(1), u(2)] }); // reorder: 3 becomes the cover
  assert.deepEqual(r.body.data.fabricImages.map((i) => i.url), [u(3), u(1), u(2)]);
  assert.deepEqual((await get(t, s.id)).body.data.fabricImages.map((i) => i.url), [u(3), u(1), u(2)]);
  r = await put(t, s.id, { fabricImages: [u(3), u(99), u(2)] }); // replace the middle one
  assert.deepEqual(r.body.data.fabricImages.map((i) => i.url), [u(3), u(99), u(2)]);
  r = await put(t, s.id, { fabricImages: [u(2)] }); // remove
  assert.equal(r.body.data.fabricImages.length, 1);
  assert.equal(r.body.data.referenceImages.length, 1); // reference gallery untouched
  assert.equal((await put(t, s.id, { fabricImages: Array.from({ length: 11 }, (_, i) => u(i)) })).status, 400);
  assert.equal((await put(t, s.id, { fabricImages: Array.from({ length: 10 }, (_, i) => u(i)) })).status, 200);
  assert.equal((await put(t, s.id, { referenceImages: Array.from({ length: 6 }, (_, i) => u(i)) })).status, 400);
  assert.equal((await put(t, s.id, { referenceImages: Array.from({ length: 5 }, (_, i) => u(i)) })).status, 200);
  assert.equal((await put(t, s.id, { fabricImages: [u(1), u(1)] })).status, 400);
  assert.equal((await put(t, s.id, { fabricImages: ["https://evil.example/x.jpg"] })).status, 400);
  assert.equal((await put(t, s.id, { fabricImages: [u(2), "not-a-url"] })).status, 400);
  assert.equal((await get(t, s.id)).body.data.fabricImages.length, 10); // failed updates changed nothing
});

test("images: a published suit cannot have its last fabric image removed", async () => {
  const t = await owner();
  const s = (await create(t, base({ fabricImages: [u(1)] }))).body.data;
  assert.equal((await setStatus(t, s.id, "published")).status, 200);
  assert.equal((await put(t, s.id, { fabricImages: [] })).status, 400);
  assert.equal((await get(t, s.id)).body.data.fabricImages.length, 1);
  await setStatus(t, s.id, "draft");
  assert.equal((await put(t, s.id, { fabricImages: [] })).status, 200);
});

test("categories: assign several, reject unknown ids, filter by category; each suit appears once", async () => {
  const t = await owner();
  const c1 = await Category.create({ name: "A", slug: "a" });
  const c2 = await Category.create({ name: "B", slug: "b" });
  const s = (await create(t, base({ categoryIds: [String(c1._id), String(c2._id), String(c1._id)] }))).body.data;
  assert.equal(s.categoryIds.length, 2); // de-duplicated
  assert.equal((await put(t, s.id, { categoryIds: ["507f1f77bcf86cd799439011"] })).status, 400);
  assert.equal((await put(t, s.id, { categoryIds: "nope" })).status, 400);
  const all = await list(t);
  assert.equal(all.body.data.total, 1);
  assert.deepEqual((await list(t, `?category=${c2._id}`)).body.data.items.map((i) => i.id), [s.id]);
  assert.equal((await list(t, "?category=bad")).status, 400);
  assert.equal(all.body.data.items[0].categories.length, 2);
});

// ---------- status / publishing / archive / delete
test("publishing rules and status transitions", async () => {
  const t = await owner();
  const noImg = (await create(t, base())).body.data;
  assert.equal((await setStatus(t, noImg.id, "published")).status, 400); // needs a fabric image
  await put(t, noImg.id, { fabricImages: [u(1)] });
  assert.equal((await setStatus(t, noImg.id, "published")).status, 200);
  assert.equal((await setStatus(t, noImg.id, "published")).status, 409); // already
  assert.equal((await setStatus(t, noImg.id, "draft")).status, 200); // unpublish
  assert.equal((await setStatus(t, noImg.id, "published")).status, 200);
  assert.equal((await setStatus(t, noImg.id, "archived")).status, 200);
  assert.equal((await setStatus(t, noImg.id, "published")).status, 409); // archived -> published is not allowed directly
  assert.equal((await setStatus(t, noImg.id, "draft")).status, 200); // restore to draft
  assert.equal((await setStatus(t, noImg.id, "bogus")).status, 400);
  assert.equal((await setStatus(t, "507f1f77bcf86cd799439011", "draft")).status, 404);
  assert.ok((await Audit.countDocuments({ action: "suit.status_changed" })) >= 5);
});

test("published suit with zero stock is allowed (stays published)", async () => {
  const t = await owner();
  const s = (await create(t, base({ fabricImages: [u(1)], status: "published", stock: 0 }))).body.data;
  assert.equal(s.status, "published");
  assert.equal(s.stockState, "out_of_stock");
});

test("featured flag toggles", async () => {
  const t = await owner();
  const s = (await create(t, base())).body.data;
  assert.equal((await put(t, s.id, { featured: true })).body.data.featured, true);
  assert.equal((await put(t, s.id, { featured: false })).body.data.featured, false);
  assert.equal((await put(t, s.id, { featured: "yes" })).status, 400);
});

test("permanent delete: owner only, confirmation required, SKU never reused, audit row written", async () => {
  const t = await owner();
  const s = (await create(t, base())).body.data;
  assert.equal((await del(t, s.id)).status, 409);
  assert.ok(await Suit.findById(s.id));
  assert.equal((await del(t, s.id, "?confirm=true")).status, 200);
  assert.equal(await Suit.findById(s.id), null);
  assert.equal((await del(t, s.id, "?confirm=true")).status, 404);
  assert.equal((await create(t, base())).body.data.sku, "SR-0002");
  assert.equal(await Audit.countDocuments({ action: "suit.deleted" }), 1);
});

// ---------- stock
test("stock: set / adjust with history; never negative; reasons required", async () => {
  const t = await owner();
  const s = (await create(t, base())).body.data;
  const ok = await stock(t, s.id, { mode: "set", quantity: 10, reason: "correction" });
  assert.deepEqual([ok.status, ok.body.data.previousQty, ok.body.data.stock, ok.body.data.change], [200, 0, 10, 10]);
  assert.equal((await stock(t, s.id, { mode: "adjust", quantity: -3, reason: "damaged", note: "water damage" })).body.data.stock, 7);
  assert.equal((await stock(t, s.id, { mode: "adjust", quantity: -8, reason: "damaged" })).status, 409); // would go negative
  assert.equal((await get(t, s.id)).body.data.stock, 7);
  assert.equal((await stock(t, s.id, { mode: "set", quantity: 7, reason: "correction" })).status, 400); // no change
  assert.equal((await stock(t, s.id, { mode: "set", quantity: -1, reason: "correction" })).status, 400);
  assert.equal((await stock(t, s.id, { mode: "set", quantity: 1.5, reason: "correction" })).status, 400);
  assert.equal((await stock(t, s.id, { mode: "set", quantity: "5", reason: "correction" })).status, 400);
  assert.equal((await stock(t, s.id, { mode: "adjust", quantity: 0, reason: "correction" })).status, 400);
  assert.equal((await stock(t, s.id, { mode: "adjust", quantity: 1, reason: "sold" })).status, 400); // order reasons are system-only
  assert.equal((await stock(t, s.id, { mode: "adjust", quantity: 1, reason: "other" })).status, 400); // needs a note
  assert.equal((await stock(t, s.id, { mode: "adjust", quantity: 1, reason: "other", note: "found a roll" })).body.data.stock, 8);
  assert.equal((await stock(t, s.id, { mode: "fix", quantity: 1, reason: "correction" })).status, 400);
  assert.equal((await stock(t, "507f1f77bcf86cd799439011", { mode: "set", quantity: 1, reason: "correction" })).status, 404);
  const hist = await json(await R.stock.GET(await makeReq(`/api/admin/suits/${s.id}/stock`, { token: t }), ctx(s.id)));
  assert.equal(hist.body.data.length, 3);
  for (const m of hist.body.data) assert.equal(m.previousQty + m.change, m.resultingQty);
  assert.deepEqual(hist.body.data.map((m) => m.resultingQty), [8, 7, 10]); // newest first
});

test("stock: admin add/remove keeps published status, records 'restock', and never changes stock without its audit row", async () => {
  const t = await owner();
  const s = (await create(t, base({ stock: 5, fabricImages: [u(1)], status: "published" }))).body.data;
  assert.equal(s.status, "published");
  const add = await stock(t, s.id, { mode: "adjust", quantity: 4, reason: "restock", note: "supplier delivery" });
  assert.deepEqual([add.status, add.body.data.previousQty, add.body.data.change, add.body.data.stock, add.body.data.stockState], [200, 5, 4, 9, "in_stock"]);
  const empty = await stock(t, s.id, { mode: "adjust", quantity: -9, reason: "correction" });
  assert.deepEqual([empty.body.data.stock, empty.body.data.stockState], [0, "out_of_stock"]);
  assert.equal((await get(t, s.id)).body.data.status, "published"); // stock changes never touch status
  assert.equal((await Movement.findOne({ suitId: s.id, reason: "restock" }).lean()).note, "supplier delivery");
  // the audit row fails to save -> the stock change is rolled back (no silent, unaudited change; a retry cannot double-apply)
  const origCreate = Movement.create;
  Movement.create = async () => { throw new Error("simulated audit insert failure"); };
  const origErr = console.error; console.error = () => {};
  try {
    assert.equal((await stock(t, s.id, { mode: "adjust", quantity: 3, reason: "restock" })).status, 500);
    assert.equal((await stock(t, s.id, { mode: "set", quantity: 7, reason: "correction" })).status, 500);
  } finally { Movement.create = origCreate; console.error = origErr; }
  assert.equal((await Suit.findById(s.id).lean()).stock, 0);
  assert.equal(await Movement.countDocuments({ suitId: s.id }), 3); // initial + restock + correction
});

test("stock: stock labels by quantity (admin low-stock warning band)", async () => {
  const t = await owner();
  const s = (await create(t, base())).body.data;
  const label = async (q) => (await stock(t, s.id, { mode: "set", quantity: q, reason: "correction" })).body.data.stockState;
  assert.equal(await label(4), "in_stock");
  assert.equal(await label(3), "low_stock");
  assert.equal(await label(1), "low_stock");
  assert.equal(await label(0), "out_of_stock");
});

test("stock: 30 concurrent single-unit decrements on 10 units leave exactly 0 and log exactly 10 movements", async () => {
  const t = await owner();
  const s = (await create(t, base())).body.data;
  await stock(t, s.id, { mode: "set", quantity: 10, reason: "correction" });
  const results = await Promise.all(Array.from({ length: 30 }, () => stock(t, s.id, { mode: "adjust", quantity: -1, reason: "damaged" })));
  assert.equal(results.filter((r) => r.status === 200).length, 10);
  assert.equal(results.filter((r) => r.status === 409).length, 20);
  assert.equal((await Suit.findById(s.id).lean()).stock, 0);
  assert.equal(await Movement.countDocuments({ suitId: s.id, reason: "damaged" }), 10);
});

// ---------- listing: search / filters / sort / pagination
test("list: search by name/SKU, status, stock state, sorting and pagination", async () => {
  const t = await owner();
  const mk = async (name, price, extra = {}) => (await create(t, { name, originalPrice: price, ...extra })).body.data;
  const a = await mk("Alpha Cotton", 1000, { stock: 10 });
  await mk("Beta Silk", 3000, { stock: 2 });
  const c = await mk("Gamma Linen (Special)", 2000);
  await put(t, a.id, { fabricImages: [u(1)] });
  await setStatus(t, a.id, "published");
  await setStatus(t, c.id, "archived");

  const ids = async (qs) => (await list(t, qs)).body.data.items.map((i) => i.name);
  assert.deepEqual(await ids("?sort=oldest"), ["Alpha Cotton", "Beta Silk", "Gamma Linen (Special)"]);
  assert.deepEqual(await ids("?sort=newest"), ["Gamma Linen (Special)", "Beta Silk", "Alpha Cotton"]);
  assert.deepEqual(await ids("?sort=price_asc"), ["Alpha Cotton", "Gamma Linen (Special)", "Beta Silk"]);
  assert.deepEqual(await ids("?sort=price_desc"), ["Beta Silk", "Gamma Linen (Special)", "Alpha Cotton"]);
  assert.deepEqual(await ids("?q=silk"), ["Beta Silk"]);
  assert.deepEqual(await ids(`?q=${a.sku}`), ["Alpha Cotton"]);
  assert.deepEqual(await ids("?q=%28Special%29"), ["Gamma Linen (Special)"]); // regex characters are escaped
  assert.equal((await list(t, "?q=.*")).body.data.total, 0); // and cannot be used as a pattern
  assert.deepEqual(await ids("?status=published"), ["Alpha Cotton"]);
  assert.deepEqual(await ids("?status=archived"), ["Gamma Linen (Special)"]);
  assert.deepEqual(await ids("?stock=low_stock"), ["Beta Silk"]);
  assert.deepEqual(await ids("?stock=out_of_stock"), ["Gamma Linen (Special)"]);
  assert.deepEqual(await ids("?stock=in_stock"), ["Alpha Cotton"]);
  assert.deepEqual(await ids("?status=published&q=alpha&sort=price_asc"), ["Alpha Cotton"]); // combined
  for (const bad of ["?status=x", "?stock=x", "?sort=x", "?limit=7", "?limit=1000"]) assert.equal((await list(t, bad)).status, 400, bad);
});

test("list: pagination with page sizes 10/20/50", async () => {
  const t = await owner();
  for (let i = 0; i < 23; i++) await Suit.create({ sku: `SR-${1000 + i}`, name: `S${i}`, originalPricePaise: 1000, salePricePaise: 1000, stock: 0 });
  const p1 = (await list(t, "?limit=10&page=1&sort=oldest")).body.data;
  assert.deepEqual([p1.items.length, p1.total, p1.pages, p1.page, p1.limit], [10, 23, 3, 1, 10]);
  const p3 = (await list(t, "?limit=10&page=3&sort=oldest")).body.data;
  assert.equal(p3.items.length, 3);
  assert.equal(new Set([...p1.items, ...p3.items].map((i) => i.id)).size, 13); // no overlap
  assert.equal((await list(t, "?limit=20")).body.data.items.length, 20);
  assert.equal((await list(t, "?limit=50")).body.data.items.length, 23);
  assert.equal((await list(t, "?limit=10&page=99")).body.data.items.length, 0);
  assert.equal((await list(t, "?page=-4")).body.data.page, 1);
});

// ---------- upload validation (runs before any Cloudinary call)
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const upload = async (token, files) => {
  const fd = new FormData();
  for (const f of files) fd.append("files", f);
  const headers = { "x-forwarded-for": "10.9.9.9" };
  if (token) headers.cookie = `admin_session=${token}`;
  return json(await R.upload.POST(new NextRequest("http://localhost/api/upload", { method: "POST", body: fd, headers })));
};
const file = (bytes, name, type) => new File([bytes], name, { type });

test("upload: validation rejects spoofed, wrong-type, empty, oversize and too many files before Cloudinary", async () => {
  const t = await user("staff", { products: true });
  const valid = file(PNG, "ok.png", "image/png");
  const passes = (r) => r.status === 503 && /Cloudinary/.test(r.body.message); // validation OK -> reached the (unconfigured) Cloudinary step
  assert.ok(passes(await upload(t, [valid])));
  assert.equal((await upload(t, [file(new TextEncoder().encode("<script>alert(1)</script>"), "x.png", "image/png")])).status, 400); // spoofed
  assert.equal((await upload(t, [file(PNG, "x.jpg", "image/jpeg")])).status, 400); // png bytes declared as jpeg
  assert.equal((await upload(t, [file(PNG, "x.svg", "image/svg+xml")])).status, 400);
  assert.equal((await upload(t, [file(PNG, "x.pdf", "application/pdf")])).status, 400);
  assert.equal((await upload(t, [file(new Uint8Array(), "e.png", "image/png")])).status, 400);
  const big = new Uint8Array(5 * 1024 * 1024 + 1); big.set(PNG);
  assert.equal((await upload(t, [file(big, "big.png", "image/png")])).status, 400);
  assert.equal((await upload(t, Array.from({ length: 11 }, (_, i) => file(PNG, `a${i}.png`, "image/png")))).status, 400);
  assert.ok(passes(await upload(t, Array.from({ length: 10 }, (_, i) => file(PNG, `a${i}.png`, "image/png")))));
  assert.equal((await upload(t, [])).status, 400);
  assert.equal((await upload(t, [valid, file(PNG, "bad.png", "text/plain")])).status, 400); // one bad file rejects the batch
  assert.equal((await upload(undefined, [valid])).status, 401);
  assert.equal((await upload(await user("staff", { orders: true }), [valid])).status, 403);
});
