// The same order/inventory suite runs against a replica set (real transactions) and a standalone server
// (compensating fallback), so both code paths are proven.
import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { startTestEnv, makeReq, json } from "./testEnv.mjs";

export function registerOrderTests({ replSet }) {
  let env, Admin, Suit, Order, Movement, Audit, Counter, signAdminToken, R = {};
  const mode = replSet ? "replica set" : "standalone";
  const ctx = (id) => ({ params: Promise.resolve({ id }) });
  let ipN = 0; const ip = () => `10.7.${Math.floor(++ipN / 250)}.${ipN % 250}`;

  before(async () => {
    env = await startTestEnv({ replSet });
    const hello = await env.mongoose.connection.db.admin().command({ hello: 1 });
    assert.equal(Boolean(hello.setName), replSet, "test is running in the intended MongoDB mode");
    ({ default: Admin } = await import("../../src/models/Admin.js"));
    ({ default: Suit } = await import("../../src/models/UnstitchedSuit.ts"));
    ({ default: Order } = await import("../../src/models/SuitOrder.ts"));
    ({ default: Movement } = await import("../../src/models/StockMovement.ts"));
    ({ default: Audit } = await import("../../src/models/AuditLog.ts"));
    ({ default: Counter } = await import("../../src/models/Counter.ts"));
    ({ signAdminToken } = await import("../../src/lib/auth/session.ts"));
    R.orders = await import("../../src/app/api/admin/orders/route.ts");
    R.one = await import("../../src/app/api/admin/orders/[id]/route.ts");
    R.status = await import("../../src/app/api/admin/orders/[id]/status/route.ts");
    R.cancel = await import("../../src/app/api/admin/orders/[id]/cancel/route.ts");
    R.pay = await import("../../src/app/api/admin/orders/[id]/payment/route.ts");
    R.suitOne = await import("../../src/app/api/admin/suits/[id]/route.ts");
    R.suitStock = await import("../../src/app/api/admin/suits/[id]/stock/route.ts");
  });
  after(() => env?.stop());
  beforeEach(() => env.reset());

  const user = async (role, permissions = {}) => {
    const a = await Admin.create({ name: role, email: `${role}${Math.random().toString(36).slice(2, 7)}@t.local`, password: await bcrypt.hash("x-not-used-1234", 4), role, permissions });
    return signAdminToken({ id: String(a._id), email: a.email, role: role === "staff" ? "staff" : "owner" });
  };
  let skuN = 0;
  const mkSuit = async (over = {}) => Suit.create({ sku: `SR-${String(++skuN).padStart(4, "0")}`, name: `Suit ${skuN}`, originalPricePaise: 200000, salePricePaise: 150000, stock: 10, fabricImages: [{ url: "https://res.cloudinary.com/demo/image/upload/v1/sara-royal/o.jpg", publicId: "sara-royal/o" }], status: "published", ...over });
  const customer = (o = {}) => ({ name: "Anita Sharma", phone: "98765 43210", address: "House 12, Sector 5, Kharar", pincode: "140301", ...o });
  const orderBody = (items, o = {}) => ({ customer: customer(), items, paymentMethod: "cod", deliveryCharge: 80, ...o });
  const place = async (tok, body, ipAddr) => json(await R.orders.POST(await makeReq("/api/admin/orders", { method: "POST", token: tok, body, ip: ipAddr ?? ip() })));
  const list = async (tok, qs = "") => json(await R.orders.GET(await makeReq(`/api/admin/orders${qs}`, { token: tok })));
  const get = async (tok, id) => json(await R.one.GET(await makeReq(`/api/admin/orders/${id}`, { token: tok }), ctx(id)));
  const edit = async (tok, id, body) => json(await R.one.PUT(await makeReq(`/api/admin/orders/${id}`, { method: "PUT", token: tok, body }), ctx(id)));
  const setStatus = async (tok, id, body) => json(await R.status.POST(await makeReq(`/api/admin/orders/${id}/status`, { method: "POST", token: tok, body }), ctx(id)));
  const cancel = async (tok, id, reason = "Customer changed mind") => json(await R.cancel.POST(await makeReq(`/api/admin/orders/${id}/cancel`, { method: "POST", token: tok, body: { reason } }), ctx(id)));
  const pay = async (tok, id, paymentStatus) => json(await R.pay.POST(await makeReq(`/api/admin/orders/${id}/payment`, { method: "POST", token: tok, body: { paymentStatus } }), ctx(id)));
  const stockOf = async (s) => (await Suit.findById(s._id).lean()).stock;
  const T = (name, fn) => test(`[${mode}] ${name}`, fn);

  T("create: freezes prices, deducts stock, logs movements, formats the order id, writes history", async () => {
    const t = await user("owner");
    const a = await mkSuit({ stock: 10 }), b = await mkSuit({ stock: 3, salePricePaise: 99950 });
    const r = await place(t, orderBody([{ suitId: String(a._id), quantity: 2 }, { suitId: String(b._id), quantity: 3 }]));
    assert.equal(r.status, 201);
    const o = r.body.data;
    assert.match(o.orderId, /^SRO-\d{4}-0001$/);
    assert.deepEqual([o.subtotalPaise, o.deliveryChargePaise, o.totalPaise], [2 * 150000 + 3 * 99950, 8000, 2 * 150000 + 3 * 99950 + 8000]);
    assert.deepEqual(o.items.map((i) => [i.sku, i.quantity, i.unitPricePaise, i.lineTotalPaise]), [[a.sku, 2, 150000, 300000], [b.sku, 3, 99950, 299850]]);
    assert.equal(o.customer.phone, "919876543210");
    assert.equal(o.status, "confirmed");
    assert.equal(o.stockDeducted, true);
    assert.equal(o.statusHistory[0].status, "confirmed");
    assert.deepEqual([await stockOf(a), await stockOf(b)], [8, 0]);
    const mv = await Movement.find({ refType: "order", refId: o.orderId }).lean();
    assert.equal(mv.length, 2);
    for (const m of mv) { assert.equal(m.previousQty + m.change, m.resultingQty); assert.equal(m.reason, "order_confirmed"); }
    assert.equal((await place(t, orderBody([{ suitId: String(a._id), quantity: 1 }]))).body.data.orderId.endsWith("0002"), true);
    assert.equal(await Audit.countDocuments({ action: "order.created" }), 2);
  });

  T("create: insufficient stock is rejected and NOTHING changes (even when only the second line is short)", async () => {
    const t = await user("owner");
    const a = await mkSuit({ stock: 5 }), b = await mkSuit({ stock: 1 });
    const r = await place(t, orderBody([{ suitId: String(a._id), quantity: 2 }, { suitId: String(b._id), quantity: 2 }]));
    assert.equal(r.status, 409);
    assert.match(r.body.message, /Not enough stock/);
    assert.deepEqual([await stockOf(a), await stockOf(b)], [5, 1]); // first line rolled back
    assert.equal(await Order.countDocuments(), 0);
    assert.equal(await Movement.countDocuments({ refType: "order" }), 0);
  });

  T("create: stock can never go negative; selling exactly the last unit works and 0 is allowed", async () => {
    const t = await user("owner");
    const a = await mkSuit({ stock: 2 });
    assert.equal((await place(t, orderBody([{ suitId: String(a._id), quantity: 3 }]))).status, 409);
    assert.equal((await place(t, orderBody([{ suitId: String(a._id), quantity: 2 }]))).status, 201);
    assert.equal(await stockOf(a), 0);
    assert.equal((await place(t, orderBody([{ suitId: String(a._id), quantity: 1 }]))).status, 409);
    assert.equal(await stockOf(a), 0);
  });

  T("create: 25 simultaneous single-unit orders on 7 units -> exactly 7 orders, stock 0, 7 movements (no oversell)", async () => {
    const t = await user("owner");
    const a = await mkSuit({ stock: 7 });
    const results = await Promise.all(Array.from({ length: 25 }, () => place(t, orderBody([{ suitId: String(a._id), quantity: 1 }]))));
    assert.equal(results.filter((r) => r.status === 201).length, 7);
    assert.equal(results.filter((r) => r.status === 409).length, 18);
    assert.equal(await stockOf(a), 0);
    assert.equal(await Order.countDocuments(), 7);
    assert.equal(await Movement.countDocuments({ refType: "order", reason: "order_confirmed" }), 7);
    const ids = (await Order.find().lean()).map((o) => o.orderId);
    assert.equal(new Set(ids).size, 7);
  });

  T("create: two orders racing for the last unit of two suits never oversell either", async () => {
    const t = await user("owner");
    const a = await mkSuit({ stock: 1 }), b = await mkSuit({ stock: 1 });
    const both = [{ suitId: String(a._id), quantity: 1 }, { suitId: String(b._id), quantity: 1 }];
    const rs = await Promise.all([place(t, orderBody(both)), place(t, orderBody([...both].reverse()))]);
    // Invariants that must hold in both modes: never oversell, stock matches the orders that really succeeded, no leftovers.
    // (With real transactions one order wins; in the standalone fallback both may back off and restore stock, which is safe.)
    const won = rs.filter((r) => r.status === 201).length;
    assert.ok(won <= 1, `at most one order can win, got ${won}`);
    if (replSet) assert.equal(won, 1);
    assert.deepEqual([await stockOf(a), await stockOf(b)], [1 - won, 1 - won]);
    assert.equal(await Order.countDocuments(), won);
    assert.equal(await Movement.countDocuments({ refType: "order" }), won * 2);
  });

  T("idempotency: a repeated submit with the same key never deducts twice (sequential and 6 concurrent)", async () => {
    const t = await user("owner");
    const a = await mkSuit({ stock: 10 });
    const body = orderBody([{ suitId: String(a._id), quantity: 2 }], { idempotencyKey: "key-abcdef-123456" });
    const first = await place(t, body);
    const second = await place(t, body);
    assert.deepEqual([first.status, second.status, second.body.data.duplicate, second.body.data.orderId === first.body.data.orderId], [201, 200, true, true]);
    assert.equal(await stockOf(a), 8);
    const body2 = orderBody([{ suitId: String(a._id), quantity: 1 }], { idempotencyKey: "key-concurrent-9999" });
    const rs = await Promise.all(Array.from({ length: 6 }, () => place(t, body2)));
    assert.ok(rs.every((r) => r.status === 200 || r.status === 201));
    assert.equal(new Set(rs.map((r) => r.body.data.orderId)).size, 1);
    assert.equal(await stockOf(a), 7); // exactly one more unit
    assert.equal(await Order.countDocuments(), 2);
    assert.equal(await Movement.countDocuments({ refType: "order" }), 2);
  });

  T("price is frozen: later catalogue price changes do not alter the order", async () => {
    const t = await user("owner");
    const a = await mkSuit({ salePricePaise: 150000 });
    const o = (await place(t, orderBody([{ suitId: String(a._id), quantity: 1 }]))).body.data;
    await Suit.updateOne({ _id: a._id }, { $set: { salePricePaise: 999900, name: "Renamed" } });
    const again = (await get(t, o.id)).body.data;
    assert.deepEqual([again.totalPaise, again.items[0].unitPricePaise, again.items[0].name], [158000 - 0 + 0, 150000, a.name]);
  });

  T("cancel: restores stock exactly once; repeated and 6 concurrent cancels add nothing extra", async () => {
    const t = await user("owner");
    const a = await mkSuit({ stock: 10 });
    const o = (await place(t, orderBody([{ suitId: String(a._id), quantity: 4 }]))).body.data;
    assert.equal(await stockOf(a), 6);
    const rs = await Promise.all(Array.from({ length: 6 }, () => cancel(t, o.id)));
    assert.equal(rs.filter((r) => r.status === 200).length, 1);
    assert.equal(rs.filter((r) => r.status === 409).length, 5);
    assert.equal(await stockOf(a), 10); // restored once, not 4 + 4 * 5
    assert.equal((await cancel(t, o.id)).status, 409);
    assert.equal(await stockOf(a), 10);
    const stored = (await get(t, o.id)).body.data;
    assert.deepEqual([stored.status, stored.stockDeducted], ["cancelled", false]);
    assert.equal(await Movement.countDocuments({ refId: o.orderId, reason: "order_cancelled" }), 1);
    assert.equal(await Audit.countDocuments({ action: "order.cancelled" }), 1);
  });

  T("cancel: needs a reason; delivered orders cannot be cancelled; unknown order is 404; stock restored after later sales", async () => {
    const t = await user("owner");
    const a = await mkSuit({ stock: 5 });
    const o = (await place(t, orderBody([{ suitId: String(a._id), quantity: 5 }]))).body.data;
    assert.equal((await cancel(t, o.id, "")).status, 400);
    assert.equal(await stockOf(a), 0);
    await setStatus(t, o.id, { status: "shipped", courierName: "DTDC" });
    await setStatus(t, o.id, { status: "delivered" });
    assert.equal((await cancel(t, o.id)).status, 409);
    assert.equal(await stockOf(a), 0); // nothing restored for a delivered order
    assert.equal((await cancel(t, "507f1f77bcf86cd799439011")).status, 404);
  });

  T("status: forward-only transitions, courier required for shipping, safe tracking links, dates, history", async () => {
    const t = await user("owner");
    const a = await mkSuit();
    const o = (await place(t, orderBody([{ suitId: String(a._id), quantity: 1 }]))).body.data;
    assert.equal((await setStatus(t, o.id, { status: "delivered" })).status, 409); // not shipped yet
    assert.equal((await setStatus(t, o.id, { status: "confirmed" })).status, 400);
    assert.equal((await setStatus(t, o.id, { status: "bogus" })).status, 400);
    assert.equal((await setStatus(t, o.id, { status: "packed" })).status, 200);
    assert.equal((await setStatus(t, o.id, { status: "packed" })).status, 409);
    assert.equal((await setStatus(t, o.id, { status: "shipped" })).status, 400); // courier name missing
    for (const bad of ["javascript:alert(1)", "http://insecure.example/t", "data:text/html,x", "https://user:pw@x.com/t", "not a url"]) {
      assert.equal((await setStatus(t, o.id, { status: "shipped", courierName: "DTDC", trackingUrl: bad })).status, 400, bad);
    }
    assert.equal((await setStatus(t, o.id, { status: "shipped", courierName: "DTDC", shippedAt: "2999-01-01" })).status, 400);
    const shipped = await setStatus(t, o.id, { status: "shipped", courierName: "DTDC", trackingNumber: "D123456", trackingUrl: "https://www.dtdc.in/track?x=D123456", shippedAt: "2026-05-02" });
    assert.equal(shipped.status, 200);
    assert.deepEqual([shipped.body.data.courier.name, shipped.body.data.courier.trackingNumber, shipped.body.data.courier.trackingUrl], ["DTDC", "D123456", "https://www.dtdc.in/track?x=D123456"]);
    assert.equal(new Date(shipped.body.data.courier.shippedAt).toISOString().slice(0, 10), "2026-05-02");
    assert.equal((await setStatus(t, o.id, { status: "packed" })).status, 409); // never backwards
    const delivered = await setStatus(t, o.id, { status: "delivered", deliveredAt: "2026-05-05" });
    assert.equal(delivered.status, 200);
    assert.equal(new Date(delivered.body.data.deliveredAt).toISOString().slice(0, 10), "2026-05-05");
    assert.deepEqual(delivered.body.data.statusHistory.map((h) => h.status), ["confirmed", "packed", "shipped", "delivered"]);
    assert.equal((await setStatus(t, o.id, { status: "shipped" })).status, 409);
    assert.equal(await stockOf(a), 9); // status moves never touch stock
  });

  T("status: confirmed can skip straight to shipped; concurrent identical status changes apply once", async () => {
    const t = await user("owner");
    const a = await mkSuit();
    const o = (await place(t, orderBody([{ suitId: String(a._id), quantity: 1 }]))).body.data;
    const rs = await Promise.all(Array.from({ length: 4 }, () => setStatus(t, o.id, { status: "shipped", courierName: "Delhivery" })));
    assert.equal(rs.filter((r) => r.status === 200).length, 1);
    assert.equal((await Order.findById(o.id).lean()).statusHistory.filter((h) => h.status === "shipped").length, 1);
  });

  T("payment: pending -> paid, duplicates and cancelled orders are refused", async () => {
    const t = await user("owner");
    const a = await mkSuit();
    const o = (await place(t, orderBody([{ suitId: String(a._id), quantity: 1 }]))).body.data;
    assert.equal(o.paymentStatus, "pending");
    assert.equal((await pay(t, o.id, "paid")).body.data.paymentStatus, "paid");
    assert.equal((await pay(t, o.id, "paid")).status, 409);
    assert.equal((await pay(t, o.id, "nope")).status, 400);
    const o2 = (await place(t, orderBody([{ suitId: String(a._id), quantity: 1 }]))).body.data;
    await cancel(t, o2.id);
    assert.equal((await pay(t, o2.id, "paid")).status, 409);
  });

  T("edit: customer details, notes and delivery charge (total recomputed); items/status refused; money locks after delivery", async () => {
    const t = await user("owner");
    const a = await mkSuit();
    const o = (await place(t, orderBody([{ suitId: String(a._id), quantity: 1 }]))).body.data;
    const e = await edit(t, o.id, { customer: { name: "Anita S.", pincode: "160055" }, notes: "Call before delivery", deliveryCharge: 120 });
    assert.equal(e.status, 200);
    assert.deepEqual([e.body.data.customer.name, e.body.data.customer.pincode, e.body.data.notes, e.body.data.deliveryChargePaise, e.body.data.totalPaise], ["Anita S.", "160055", "Call before delivery", 12000, 162000]);
    assert.equal(e.body.data.customer.address, "House 12, Sector 5, Kharar"); // untouched fields stay
    assert.equal((await edit(t, o.id, { items: [] })).status, 400);
    assert.equal((await edit(t, o.id, { status: "delivered" })).status, 400);
    assert.equal((await edit(t, o.id, { customer: { pincode: "12" } })).status, 400);
    assert.equal((await edit(t, o.id, { customer: { phone: "123" } })).status, 400);
    assert.equal((await edit(t, o.id, { deliveryCharge: "-5" })).status, 400);
    assert.equal((await edit(t, o.id, { trackingUrl: "javascript:alert(1)" })).status, 400);
    assert.equal((await edit(t, o.id, {})).status, 400);
    await setStatus(t, o.id, { status: "shipped", courierName: "DTDC" }); await setStatus(t, o.id, { status: "delivered" });
    assert.equal((await edit(t, o.id, { deliveryCharge: 0 })).status, 409);
    assert.equal((await edit(t, o.id, { notes: "still editable" })).status, 200);
  });

  T("validation: phone/PIN/address/method/quantities", async () => {
    const t = await user("owner");
    const a = await mkSuit({ stock: 50 });
    const item = [{ suitId: String(a._id), quantity: 1 }];
    const bad = async (body, re) => { const r = await place(t, body); assert.equal(r.status, 400, JSON.stringify(body).slice(0, 80)); if (re) assert.match(r.body.message, re); };
    await bad(orderBody(item, { customer: customer({ name: "" }) }), /name/i);
    await bad(orderBody(item, { customer: customer({ phone: "12345" }) }), /phone/i);
    await bad(orderBody(item, { customer: customer({ phone: "abc" }) }), /phone/i);
    await bad(orderBody(item, { customer: customer({ pincode: "0123456" }) }), /PIN/);
    await bad(orderBody(item, { customer: customer({ pincode: "012345" }) }), /PIN/);
    await bad(orderBody(item, { customer: customer({ address: "x" }) }), /address/i);
    await bad(orderBody(item, { paymentMethod: "card" }), /Payment method/);
    await bad(orderBody(item, { paymentMethod: undefined }), /Payment method/);
    await bad(orderBody(item, { deliveryCharge: "abc" }), /Delivery/);
    await bad(orderBody(item, { idempotencyKey: "short" }), /idempotency/i);
    await bad(orderBody([], {}), /items/i);
    await bad(orderBody([{ suitId: String(a._id), quantity: 0 }]), /Quantities/);
    await bad(orderBody([{ suitId: String(a._id), quantity: 1.5 }]), /Quantities/);
    await bad(orderBody([{ suitId: String(a._id), quantity: 1 }, { suitId: String(a._id), quantity: 1 }]), /twice/);
    await bad(orderBody([{ suitId: "nope", quantity: 1 }]), /invalid suit/);
    await bad(orderBody([{ suitId: "507f1f77bcf86cd799439011", quantity: 1 }]), /no longer exists/);
    assert.equal(await stockOf(a), 50);
    for (const phone of ["9876543210", "+91 98765-43210", "919876543210", "+14155550123"]) assert.equal((await place(t, orderBody(item, { customer: customer({ phone }) }))).status, 201, phone);
  });

  T("list: filters (status, payment, method, search, IST date range), sorting and pagination", async () => {
    const t = await user("owner");
    const a = await mkSuit({ stock: 100 });
    const mk = async (over = {}, qty = 1) => (await place(t, orderBody([{ suitId: String(a._id), quantity: qty }], over))).body.data;
    const o1 = await mk({ customer: customer({ name: "Priya Verma", phone: "9811111111" }) });
    const o2 = await mk({ paymentMethod: "upi", customer: customer({ name: "Rahul Singh", phone: "9822222222" }) }, 3);
    const o3 = await mk();
    await pay(t, o2.id, "paid"); await cancel(t, o3.id);
    const ids = async (qs) => (await list(t, qs)).body.data.items.map((i) => i.orderId);
    assert.deepEqual(await ids(""), [o3.orderId, o2.orderId, o1.orderId]);
    assert.deepEqual(await ids("?sort=oldest"), [o1.orderId, o2.orderId, o3.orderId]);
    assert.deepEqual(await ids("?sort=total_desc"), [o2.orderId, o3.orderId, o1.orderId]); // 3 units first; o1 and o3 tie, newest first
    assert.deepEqual(await ids("?sort=total_asc"), [o1.orderId, o3.orderId, o2.orderId]);
    assert.deepEqual(await ids("?status=cancelled"), [o3.orderId]);
    assert.deepEqual(await ids("?payment=paid"), [o2.orderId]);
    assert.deepEqual(await ids("?method=upi"), [o2.orderId]);
    assert.deepEqual(await ids("?q=priya"), [o1.orderId]);
    assert.deepEqual(await ids("?q=9822222222"), [o2.orderId]);
    assert.deepEqual(await ids(`?q=${o1.orderId}`), [o1.orderId]);
    assert.deepEqual(await ids(`?q=${a.sku}`), [o3.orderId, o2.orderId, o1.orderId]);
    assert.equal((await list(t, "?q=.*")).body.data.total, 0);
    const today = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
    assert.equal((await list(t, `?from=${today}&to=${today}`)).body.data.total, 3);
    assert.equal((await list(t, "?from=2020-01-01&to=2020-01-31")).body.data.total, 0);
    for (const bad of ["?status=x", "?payment=x", "?method=x", "?sort=x", "?limit=7", "?from=2026-13-01&to=2026-13-02", "?from=2026-02-30&to=2026-03-01", "?from=2026-05-02&to=2026-05-01"]) assert.equal((await list(t, bad)).status, 400, bad);
    const p = (await list(t, "?limit=10&page=2")).body.data;
    assert.deepEqual([p.items.length, p.total, p.pages], [0, 3, 1]);
  });

  T("permissions: every order endpoint needs the orders permission (anonymous 401, others 403)", async () => {
    const owner = await user("owner");
    const a = await mkSuit();
    const o = (await place(owner, orderBody([{ suitId: String(a._id), quantity: 1 }]))).body.data;
    const none = await user("staff", {});
    const stockOnly = await user("staff", { products: true, stock: true, returns: true, reports: true });
    const calls = {
      list: (tk) => list(tk), create: (tk) => place(tk, orderBody([{ suitId: String(a._id), quantity: 1 }])), get: (tk) => get(tk, o.id),
      edit: (tk) => edit(tk, o.id, { notes: "x" }), status: (tk) => setStatus(tk, o.id, { status: "packed" }), cancel: (tk) => cancel(tk, o.id), pay: (tk) => pay(tk, o.id, "paid"),
    };
    for (const [name, call] of Object.entries(calls)) {
      assert.equal((await call(undefined)).status, 401, `${name} anonymous`);
      assert.equal((await call(none)).status, 403, `${name} no permissions`);
      assert.equal((await call(stockOnly)).status, 403, `${name} other permissions only`);
    }
    assert.equal((await Order.findById(o.id).lean()).status, "confirmed");
    const staffOrders = await user("staff", { orders: true });
    assert.equal((await list(staffOrders)).status, 200);
    assert.equal((await place(staffOrders, orderBody([{ suitId: String(a._id), quantity: 1 }]))).status, 201);
  });

  T("suit referenced by an order cannot be deleted (even by the owner); archive still works; unreferenced suit deletes", async () => {
    const owner = await user("owner");
    const sold = await mkSuit(), unsold = await mkSuit();
    await place(owner, orderBody([{ suitId: String(sold._id), quantity: 1 }]));
    const del = async (s) => json(await R.suitOne.DELETE(await makeReq(`/api/admin/suits/${s._id}?confirm=true`, { method: "DELETE", token: owner }), ctx(String(s._id))));
    const blocked = await del(sold);
    assert.equal(blocked.status, 409);
    assert.match(blocked.body.message, /existing orders/);
    assert.ok(await Suit.findById(sold._id));
    assert.equal((await del(unsold)).status, 200);
    assert.equal(await Suit.findById(unsold._id), null);
  });

  T("manual stock adjustments and orders share one consistent movement history", async () => {
    const t = await user("owner");
    const a = await mkSuit({ stock: 5 });
    await place(t, orderBody([{ suitId: String(a._id), quantity: 2 }]));
    const adj = await json(await R.suitStock.POST(await makeReq(`/api/admin/suits/${a._id}/stock`, { method: "POST", token: t, body: { mode: "adjust", quantity: -1, reason: "damaged" } }), ctx(String(a._id))));
    assert.equal(adj.body.data.stock, 2);
    const rows = await Movement.find({ suitId: a._id }).sort({ createdAt: 1, _id: 1 }).lean();
    assert.deepEqual(rows.map((m) => m.reason), ["order_confirmed", "damaged"]);
    for (let i = 1; i < rows.length; i++) assert.equal(rows[i].previousQty, rows[i - 1].resultingQty); // unbroken chain
  });

  T("counters never reuse an order number", async () => {
    const t = await user("owner");
    const a = await mkSuit({ stock: 50 });
    const first = (await place(t, orderBody([{ suitId: String(a._id), quantity: 1 }]))).body.data;
    await Order.deleteOne({ _id: first.id });
    const second = (await place(t, orderBody([{ suitId: String(a._id), quantity: 1 }]))).body.data;
    assert.notEqual(second.orderId, first.orderId);
    assert.ok((await Counter.findOne({ _id: /^suit-order-/ }).lean()).seq >= 2);
  });
}
