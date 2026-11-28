import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { startTestEnv, makeReq, json } from "./testEnv.mjs";

// Image variants (same design, different colours): one suit, several variants, each with its own photos and stock.
// Runs on a standalone mongod (compensating undo) and on a replica set (transactions).
export function registerVariantTests({ replSet }) {
  let env, Admin, Suit, Order, Movement, signAdminToken, cloud, R = {};
  const mode = replSet ? "replica set" : "standalone";
  const T = (name, fn) => test(`[${mode}] variants: ${name}`, fn);
  const ctx = (id) => ({ params: Promise.resolve({ id }) });
  let ipN = 0; const ip = () => `10.9.${Math.floor(++ipN / 250)}.${ipN % 250}`;
  const destroyed = [];
  const img = (n) => `https://res.cloudinary.com/demo/image/upload/v1/sara-royal/var-${n}.jpg`;

  before(async () => {
    env = await startTestEnv({ replSet });
    Object.assign(process.env, { CLOUDINARY_CLOUD_NAME: "demo", CLOUDINARY_API_KEY: "k", CLOUDINARY_API_SECRET: "s" });
    ({ default: Admin } = await import("../../src/models/Admin.js"));
    ({ default: Suit } = await import("../../src/models/UnstitchedSuit.ts"));
    ({ default: Order } = await import("../../src/models/SuitOrder.ts"));
    ({ default: Movement } = await import("../../src/models/StockMovement.ts"));
    ({ signAdminToken } = await import("../../src/lib/auth/session.ts"));
    ({ cloudinary: cloud } = await import("../../src/lib/cloudinary.ts"));
    cloud.uploader.destroy = async (id) => { destroyed.push(id); return { result: "ok" }; };
    R.list = await import("../../src/app/api/admin/suits/route.ts");
    R.one = await import("../../src/app/api/admin/suits/[id]/route.ts");
    R.status = await import("../../src/app/api/admin/suits/[id]/status/route.ts");
    R.stock = await import("../../src/app/api/admin/suits/[id]/stock/route.ts");
    R.orderSuits = await import("../../src/app/api/admin/order-suits/route.ts");
    R.orders = await import("../../src/app/api/admin/orders/route.ts");
    R.orderStatus = await import("../../src/app/api/admin/orders/[id]/status/route.ts");
    R.cancel = await import("../../src/app/api/admin/orders/[id]/cancel/route.ts");
    R.returns = await import("../../src/app/api/admin/returns/route.ts");
    R.retAct = await import("../../src/app/api/admin/returns/[id]/action/route.ts");
    R.pubOne = await import("../../src/app/api/suits/[id]/route.ts");
    R.pubList = await import("../../src/app/api/suits/route.ts");
    R.validate = await import("../../src/app/api/suit-cart/validate/route.ts");
  });
  after(() => env?.stop());
  beforeEach(async () => { await env.reset(); destroyed.length = 0; });

  const user = async (role, permissions = {}) => {
    const a = await Admin.create({ name: role, email: `${role}${Math.random().toString(36).slice(2, 7)}@t.local`, password: await bcrypt.hash("x-not-used-1234", 4), role, permissions });
    return signAdminToken({ id: String(a._id), email: a.email, role: role === "staff" ? "staff" : "owner" });
  };
  const call = async (route, method, url, { token, body, id } = {}) => json(await route[method](await makeReq(url, { method, token, body, ip: ip() }), id ? ctx(id) : undefined));
  const create = (t, body) => call(R.list, "POST", "/api/admin/suits", { token: t, body });
  const put = (t, id, body) => call(R.one, "PUT", `/api/admin/suits/${id}`, { token: t, body, id });
  const getAdmin = (t, id) => call(R.one, "GET", `/api/admin/suits/${id}`, { token: t, id });
  const stock = (t, id, body) => call(R.stock, "POST", `/api/admin/suits/${id}/stock`, { token: t, body, id });
  const publish = (t, id) => call(R.status, "POST", `/api/admin/suits/${id}/status`, { token: t, body: { status: "published" }, id });
  const pub = (id) => call(R.pubOne, "GET", `/api/suits/${id}`, { id });
  const validate = (items) => call(R.validate, "POST", "/api/suit-cart/validate", { body: { items } });
  const customer = { name: "Anita Sharma", phone: "9876543210", address: "House 12, Sector 5, Kharar", pincode: "140301" };
  const order = (t, items) => call(R.orders, "POST", "/api/admin/orders", { token: t, body: { customer, items, paymentMethod: "upi", paymentStatus: "paid" } });
  const retAct = (t, id, body) => call(R.retAct, "POST", `/api/admin/returns/${id}/action`, { token: t, body, id });
  const ALL = { products: true, orders: true, stock: true, returns: true };

  /** The invariant behind everything: a variant suit's stock is always the sum of its variants. */
  const doc = async (id) => {
    const d = await Suit.findById(id).lean();
    if (d.variants.length) assert.equal(d.stock, d.variants.reduce((s, v) => s + v.stock, 0), "suit stock must equal the variants' total");
    return d;
  };
  const stocks = async (id) => (await doc(id)).variants.map((v) => v.stock);

  /** "5 suits with the same design but different colours": one suit, 5 image variants, 1 piece each. */
  const fiveColours = async (t, over = {}) => {
    const r = await create(t, {
      name: "Chanderi Silk Suit", originalPrice: 3000, salePrice: 2500, fabricImages: [img("cover")],
      variants: [1, 2, 3, 4, 5].map((n) => ({ images: [img(`c${n}a`), img(`c${n}b`)], stock: 1 })), ...over,
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return r.body.data;
  };

  T("create: one suit with 5 image variants, each with its own stock and opening-stock audit row; codes SR-0001-V1…V5", async () => {
    const t = await user("owner");
    const s = await fiveColours(t);
    assert.equal(s.sku, "SR-0001");
    assert.equal(s.stock, 5);
    assert.deepEqual(s.variants.map((v) => [v.code, v.stock, v.images.length]), [1, 2, 3, 4, 5].map((n) => [`SR-0001-V${n}`, 1, 2]));
    assert.equal(await Suit.countDocuments(), 1, "no duplicate products");
    const rows = await Movement.find({ suitId: s.id }).lean();
    assert.equal(rows.length, 5);
    assert.ok(rows.every((r) => r.reason === "initial" && r.change === 1 && r.variantId && /^SR-0001-V[1-5]$/.test(r.sku)));
    // plain suits are created exactly as before
    const plain = (await create(t, { name: "Plain", originalPrice: 1000, stock: 3 })).body.data;
    assert.deepEqual([plain.stock, plain.variants.length, plain.sku], [3, 0, "SR-0002"]);
    assert.equal((await Movement.countDocuments({ suitId: plain.id, variantId: { $exists: false } })), 1);
  });

  T("create: validation (each variant needs a photo, whole-number stock, max 12) and the stock permission for opening stock", async () => {
    const t = await user("owner");
    for (const variants of [[{ images: [], stock: 1 }], [{ images: [img(1)], stock: -1 }], [{ images: [img(1)], stock: 1.5 }], [{ images: ["https://evil.example/x.jpg"] }], Array.from({ length: 13 }, (_, i) => ({ images: [img(i)] }))]) {
      assert.equal((await create(t, { name: "X", originalPrice: 100, variants })).status, 400, JSON.stringify(variants));
    }
    const productsOnly = await user("staff", { products: true });
    assert.equal((await create(productsOnly, { name: "X", originalPrice: 100, variants: [{ images: [img(1)], stock: 2 }] })).status, 403);
    assert.equal((await create(productsOnly, { name: "X", originalPrice: 100, variants: [{ images: [img(1)] }] })).status, 201); // 0 stock is fine
  });

  T("public API: variants with their own photos / availability / stock; list shows variantCount; admin-only data stays private", async () => {
    const t = await user("owner");
    const s = await fiveColours(t);
    assert.equal((await publish(t, s.id)).status, 200);
    const d = (await pub(s.id)).body.data;
    assert.equal(d.variants.length, 5);
    assert.deepEqual(d.variants[2], { id: s.variants[2].id, code: "SR-0001-V3", images: [img("c3a"), img("c3b")], cover: img("c3a"), inStock: true, maxQuantity: 1 });
    assert.equal(d.inStock, true);
    assert.equal(d.salePricePaise, 250000, "price is the suit's, unchanged");
    assert.ok(!("stock" in d.variants[0]) && !("publicId" in d.variants[0]));
    const listed = (await call(R.pubList, "GET", "/api/suits")).body.data.items[0];
    assert.equal(listed.variantCount, 5);
    const plain = (await create(t, { name: "Plain", originalPrice: 1000, stock: 2, fabricImages: [img("p")], status: "published" })).body.data;
    const pd = (await pub(plain.id)).body.data;
    assert.deepEqual([pd.variants, pd.variantCount, pd.maxQuantity], [[], 0, 2]);
  });

  T("cart validation: per-variant stock; two variants are separate lines; variant-less or unknown variant lines cannot check out", async () => {
    const t = await user("owner");
    const s = await fiveColours(t);
    await publish(t, s.id);
    const [v1, v2] = s.variants;
    let r = await validate([{ id: s.id, variantId: v1.id, quantity: 1 }, { id: s.id, variantId: v2.id, quantity: 1 }]);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.canCheckout, true);
    assert.deepEqual(r.body.data.items.map((i) => [i.variantId, i.variantCode, i.maxQuantity, i.image]), [[v1.id, "SR-0001-V1", 1, img("c1a")], [v2.id, "SR-0001-V2", 1, img("c2a")]]);
    assert.equal(r.body.data.subtotalPaise, 500000);
    r = await validate([{ id: s.id, variantId: v1.id, quantity: 2 }]);
    assert.deepEqual([r.body.data.canCheckout, r.body.data.items[0].issue, r.body.data.items[0].maxQuantity], [false, "insufficient_stock", 1]);
    for (const line of [{ id: s.id, quantity: 1 }, { id: s.id, variantId: "507f1f77bcf86cd799439011", quantity: 1 }]) {
      r = await validate([line]);
      assert.deepEqual([r.body.data.canCheckout, r.body.data.items[0].issue], [false, "unavailable"], JSON.stringify(line));
    }
    assert.equal((await validate([{ id: s.id, variantId: v1.id, quantity: 1 }, { id: s.id, variantId: v1.id, quantity: 1 }])).status, 400, "duplicate line");
    assert.equal((await validate([{ id: s.id, variantId: "nope", quantity: 1 }])).status, 400);
    const plain = (await create(t, { name: "Plain", originalPrice: 1000, stock: 2, fabricImages: [img("p")], status: "published" })).body.data;
    assert.equal((await validate([{ id: plain.id, quantity: 2 }])).body.data.canCheckout, true, "plain suits unchanged");
    assert.equal((await validate([{ id: plain.id, variantId: v1.id, quantity: 1 }])).body.data.items[0].issue, "unavailable");
  });

  T("all five variants independently: ordering each one only sells out that variant, the others stay available", async () => {
    const t = await user("owner", ALL);
    const s = await fiveColours(t);
    await publish(t, s.id);
    for (let i = 0; i < 5; i++) {
      const v = s.variants[i];
      const o = await order(t, [{ suitId: s.id, variantId: v.id, quantity: 1 }]);
      assert.equal(o.status, 201, JSON.stringify(o.body));
      assert.deepEqual([o.body.data.items[0].sku, o.body.data.items[0].variantId], [v.code, v.id]);
      assert.deepEqual(await stocks(s.id), [0, 1, 2, 3, 4].map((j) => (j <= i ? 0 : 1)), `after ordering ${v.code}`);
      const d = (await pub(s.id)).body.data;
      assert.deepEqual(d.variants.map((x) => x.inStock), [0, 1, 2, 3, 4].map((j) => j > i));
      assert.equal(d.inStock, i < 4);
      // the sold-out variant can no longer be ordered or checked out; the next one still can
      assert.equal((await order(t, [{ suitId: s.id, variantId: v.id, quantity: 1 }])).status, 409);
      assert.equal((await validate([{ id: s.id, variantId: v.id, quantity: 1 }])).body.data.items[0].issue, "out_of_stock");
      const m = await Movement.findOne({ suitId: s.id, reason: "order_confirmed", variantId: v.id }).lean();
      assert.deepEqual([m.sku, m.previousQty, m.change, m.resultingQty], [v.code, 1, -1, 0]);
    }
    assert.equal((await doc(s.id)).stock, 0);
    assert.equal((await order(t, [{ suitId: s.id, quantity: 1 }])).status, 400, "a variant suit cannot be ordered without choosing the variant");
  });

  T("orders: variants of one suit are separate lines; cancelling puts each unit back on its own variant exactly once", async () => {
    const t = await user("owner", ALL);
    const s = await fiveColours(t, { variants: [1, 2, 3, 4, 5].map((n) => ({ images: [img(`d${n}`)], stock: 2 })) });
    const [v1, , v3] = s.variants;
    const o = (await order(t, [{ suitId: s.id, variantId: v1.id, quantity: 2 }, { suitId: s.id, variantId: v3.id, quantity: 1 }])).body.data;
    assert.deepEqual(await stocks(s.id), [0, 2, 1, 2, 2]);
    assert.equal((await order(t, [{ suitId: s.id, variantId: v1.id, quantity: 1 }, { suitId: s.id, variantId: v1.id, quantity: 1 }])).status, 400, "same variant twice");
    const c = await call(R.cancel, "POST", `/api/admin/orders/${o.id}/cancel`, { token: t, body: { reason: "Customer changed mind" }, id: o.id });
    assert.equal(c.status, 200, JSON.stringify(c.body));
    assert.deepEqual(await stocks(s.id), [2, 2, 2, 2, 2]);
    assert.equal((await call(R.cancel, "POST", `/api/admin/orders/${o.id}/cancel`, { token: t, body: { reason: "again" }, id: o.id })).status, 409);
    assert.deepEqual(await stocks(s.id), [2, 2, 2, 2, 2]);
    // all-or-nothing: a line that cannot be fulfilled leaves every variant untouched
    assert.equal((await order(t, [{ suitId: s.id, variantId: v1.id, quantity: 1 }, { suitId: s.id, variantId: v3.id, quantity: 5 }])).status, 409);
    assert.deepEqual(await stocks(s.id), [2, 2, 2, 2, 2]);
  });

  T("admin stock: adjust / set one variant (others untouched, total follows); never negative; variant required", async () => {
    const t = await user("owner");
    const s = await fiveColours(t);
    const v3 = s.variants[2];
    let r = await stock(t, s.id, { mode: "adjust", quantity: 4, reason: "restock", variantId: v3.id });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual([r.body.data.variantId, r.body.data.previousQty, r.body.data.stock, r.body.data.totalStock], [v3.id, 1, 5, 9]);
    assert.deepEqual(await stocks(s.id), [1, 1, 5, 1, 1]);
    assert.equal((await stock(t, s.id, { mode: "adjust", quantity: -2, reason: "correction", variantId: s.variants[1].id })).status, 409);
    assert.equal((await stock(t, s.id, { mode: "adjust", quantity: 1, reason: "restock" })).status, 400, "which variant?");
    assert.equal((await stock(t, s.id, { mode: "adjust", quantity: 1, reason: "restock", variantId: "507f1f77bcf86cd799439011" })).status, 400);
    r = await stock(t, s.id, { mode: "set", quantity: 0, reason: "damaged", variantId: s.variants[4].id });
    assert.deepEqual([r.status, r.body.data.stock, r.body.data.totalStock], [200, 0, 8]);
    assert.deepEqual(await stocks(s.id), [1, 1, 5, 1, 0]);
    const hist = (await call(R.stock, "GET", `/api/admin/suits/${s.id}/stock`, { token: t, id: s.id })).body.data;
    assert.deepEqual([hist[0].sku, hist[0].previousQty, hist[0].resultingQty, hist[0].reason], ["SR-0001-V5", 1, 0, "damaged"]);
    // the status (published / draft) is never changed by stock
    assert.equal((await doc(s.id)).status, "draft");
  });

  T("edit: photos change without touching stock; a stale form never overwrites stock; new variant gets the next code; stocked variant cannot be removed", async () => {
    const t = await user("owner", ALL);
    const s = await fiveColours(t);
    const stale = (await getAdmin(t, s.id)).body.data; // the admin opened the edit page…
    await order(t, [{ suitId: s.id, variantId: s.variants[1].id, quantity: 1 }]); // …then an order sold V2
    // the form re-sends every variant (even with a stock number for existing ones): stock is ignored for existing variants
    const variants = stale.variants.map((v, i) => ({ id: v.id, stock: 99, images: i === 0 ? [img("c1-new")] : v.images.map((x) => x.url) }));
    let r = await put(t, s.id, { name: "Chanderi Silk Suit (new photos)", variants: [...variants, { images: [img("c6")], stock: 3 }] });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual(r.body.data.variants.map((v) => [v.code, v.stock]), [["SR-0001-V1", 1], ["SR-0001-V2", 0], ["SR-0001-V3", 1], ["SR-0001-V4", 1], ["SR-0001-V5", 1], ["SR-0001-V6", 3]]);
    assert.equal(r.body.data.stock, 7);
    assert.deepEqual(r.body.data.variants[0].images.map((i) => i.url), [img("c1-new")]);
    assert.equal(r.body.data.name, "Chanderi Silk Suit (new photos)");
    const v6 = await Movement.findOne({ suitId: s.id, sku: "SR-0001-V6" }).lean();
    assert.deepEqual([v6.reason, v6.change, v6.resultingQty], ["initial", 3, 3]);
    assert.ok(destroyed.includes("sara-royal/var-c1a") && destroyed.includes("sara-royal/var-c1b"), "replaced variant photos are cleaned up");
    // removing a variant that still has stock is refused (its units would vanish without an audit row)
    const cur = r.body.data.variants;
    const without = (code) => cur.filter((v) => v.code !== code).map((v) => ({ id: v.id, images: v.images.map((x) => x.url) }));
    r = await put(t, s.id, { variants: without("SR-0001-V4") });
    assert.equal(r.status, 409);
    assert.match(r.body.message, /SR-0001-V4 still has 1 in stock/);
    // a sold-out variant can be removed; its code is never reused
    r = await put(t, s.id, { variants: [...without("SR-0001-V2"), { images: [img("c7")] }] });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual(r.body.data.variants.map((v) => v.code), ["SR-0001-V1", "SR-0001-V3", "SR-0001-V4", "SR-0001-V5", "SR-0001-V6", "SR-0001-V7"]);
    await doc(s.id);
    // a variant photo that is also the suit's cover is never deleted from Cloudinary
    destroyed.length = 0;
    const now = r.body.data.variants;
    r = await put(t, s.id, { fabricImages: [img("c3a")], variants: now.map((v) => ({ id: v.id, images: v.code === "SR-0001-V3" ? [img("c3-new")] : v.images.map((x) => x.url) })) });
    assert.equal(r.status, 200);
    assert.ok(!destroyed.includes("sara-royal/var-c3a") && destroyed.includes("sara-royal/var-c3b") && destroyed.includes("sara-royal/var-cover"));
  });

  T("edit: an existing plain suit gets variants (stock moves to them, audited); legacy orders still cancel cleanly", async () => {
    const t = await user("owner", ALL);
    const plain = (await create(t, { name: "Plain Lawn", originalPrice: 1000, stock: 4, fabricImages: [img("p")] })).body.data;
    const legacy = (await order(t, [{ suitId: plain.id, quantity: 1 }])).body.data; // ordered before it had variants
    assert.equal((await doc(plain.id)).stock, 3);
    const productsOnly = await user("staff", { products: true });
    assert.equal((await put(productsOnly, plain.id, { variants: [{ images: [img("a")] }] })).status, 403, "moving 3 units needs the stock permission");
    const r = await put(t, plain.id, { variants: [{ images: [img("a")], stock: 2 }, { images: [img("b")], stock: 1 }] });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual([r.body.data.stock, ...r.body.data.variants.map((v) => v.stock)], [3, 2, 1]);
    const moved = await Movement.findOne({ suitId: plain.id, reason: "correction" }).lean();
    assert.deepEqual([moved.previousQty, moved.change, moved.resultingQty], [3, -3, 0]);
    // the old order had no variant: cancelling it returns the unit to the first variant and keeps the total consistent
    assert.equal((await call(R.cancel, "POST", `/api/admin/orders/${legacy.id}/cancel`, { token: t, body: { reason: "Customer cancelled" }, id: legacy.id })).status, 200);
    assert.deepEqual(await stocks(plain.id), [3, 1]);
    // editing a suit WITHOUT variants still uses the original save path (no variants field sent)
    const other = (await create(t, { name: "Other", originalPrice: 500, stock: 2 })).body.data;
    const e = await put(t, other.id, { name: "Other renamed", salePrice: 400 });
    assert.deepEqual([e.status, e.body.data.stock, e.body.data.variants.length, e.body.data.salePrice], [200, 2, 0, 400]);
  });

  T("returns and exchanges: restock goes back to the returned variant; a replacement is taken from the chosen variant", async () => {
    const t = await user("owner", ALL);
    const s = await fiveColours(t, { variants: [1, 2, 3, 4, 5].map((n) => ({ images: [img(`e${n}`)], stock: 2 })) });
    const [v1, v2, v3] = s.variants;
    const o = (await order(t, [{ suitId: s.id, variantId: v1.id, quantity: 1 }, { suitId: s.id, variantId: v2.id, quantity: 1 }])).body.data;
    for (const st of ["shipped", "delivered"]) {
      const x = await call(R.orderStatus, "POST", `/api/admin/orders/${o.id}/status`, { token: t, body: { status: st, courierName: "DTDC" }, id: o.id });
      assert.equal(x.status, 200, JSON.stringify(x.body));
    }
    assert.deepEqual(await stocks(s.id), [1, 1, 2, 2, 2]);
    const body = { orderId: o.id, items: [{ suitId: s.id, variantId: v2.id, quantity: 1 }], reasonType: "preference", unusedUncutConfirmed: true };
    const ret = await call(R.returns, "POST", "/api/admin/returns", { token: t, body });
    assert.equal(ret.status, 201, JSON.stringify(ret.body));
    assert.deepEqual([ret.body.data.items[0].sku, ret.body.data.items[0].variantId], ["SR-0001-V2", v2.id]);
    const lines = (await Order.findById(o.id).lean()).items;
    assert.deepEqual(lines.map((l) => l.returnedQuantity), [0, 1], "only the V2 line is reserved");
    assert.equal((await call(R.returns, "POST", "/api/admin/returns", { token: t, body })).status, 409, "V2 was ordered once");
    const id = ret.body.data.id;
    for (const a of [{ action: "decide", decision: "approved" }, { action: "receive" }, { action: "inspect", result: "resellable" }, { action: "restock" }]) {
      const x = await retAct(t, id, a);
      assert.equal(x.status, 200, `${a.action}: ${JSON.stringify(x.body)}`);
    }
    assert.deepEqual(await stocks(s.id), [1, 2, 2, 2, 2], "V2 restocked, nothing else");
    // exchange: the replacement must say which variant, and stock comes from that variant
    assert.equal((await retAct(t, id, { action: "resolve", resolution: "exchange", exchange: { replacementSuitId: s.id, quantity: 1 } })).status, 400);
    assert.equal((await retAct(t, id, { action: "resolve", resolution: "exchange", exchange: { replacementSuitId: s.id, replacementVariantId: v3.id, quantity: 1 } })).status, 200);
    assert.equal((await retAct(t, id, { action: "fulfil-exchange" })).status, 200);
    assert.deepEqual(await stocks(s.id), [1, 2, 1, 2, 2]);
    const ex = await Movement.findOne({ suitId: s.id, reason: "exchange" }).lean();
    assert.deepEqual([ex.sku, String(ex.variantId), ex.previousQty, ex.resultingQty], ["SR-0001-V3", v3.id, 2, 1]);
  });

  T("admin order search lists each variant as its own row with its own stock", async () => {
    const t = await user("owner", ALL);
    const s = await fiveColours(t);
    await stock(t, s.id, { mode: "adjust", quantity: 2, reason: "restock", variantId: s.variants[3].id });
    const rows = (await call(R.orderSuits, "GET", "/api/admin/order-suits?q=Chanderi", { token: t })).body.data;
    assert.deepEqual(rows.map((r) => [r.sku, r.stock, r.variantId]), s.variants.map((v, i) => [v.code, i === 3 ? 3 : 1, v.id]));
    assert.equal((await call(R.orderSuits, "GET", "/api/admin/order-suits?q=SR-0001-V4", { token: t })).body.data.length, 5, "found by variant code");
  });

  T("concurrency: 12 parallel single-unit orders on one variant with 5 pieces sell exactly 5; other variants untouched", async () => {
    const t = await user("owner", ALL);
    const s = await fiveColours(t, { variants: [5, 1, 1].map((n, i) => ({ images: [img(`k${i}`)], stock: n })) });
    const v1 = s.variants[0];
    const results = await Promise.all(Array.from({ length: 12 }, () => order(t, [{ suitId: s.id, variantId: v1.id, quantity: 1 }])));
    assert.equal(results.filter((r) => r.status === 201).length, 5);
    assert.deepEqual(await stocks(s.id), [0, 1, 1]);
    assert.equal(await Movement.countDocuments({ suitId: s.id, reason: "order_confirmed" }), 5);
  });
}
