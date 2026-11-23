import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { startTestEnv, makeReq, json } from "./testEnv.mjs";

export function registerPhase6Tests({ replSet }) {
  let env, Admin, Suit, Order, Movement, Audit, Return, Refund, Invoice, Settings, signAdminToken, cloud, R = {}, S = {};
  const mode = replSet ? "replica set" : "standalone";
  const ctx = (id) => ({ params: Promise.resolve({ id }) });
  const T = (name, fn) => test(`[${mode}] ${name}`, fn);
  let ipN = 0; const ip = () => `10.8.${Math.floor(++ipN / 250)}.${ipN % 250}`;
  const destroyed = [];
  const img = (n) => `https://res.cloudinary.com/demo/image/upload/v1/sara-royal/ev-${n}.jpg`;

  before(async () => {
    env = await startTestEnv({ replSet });
    Object.assign(process.env, { CLOUDINARY_CLOUD_NAME: "demo", CLOUDINARY_API_KEY: "k", CLOUDINARY_API_SECRET: "s" });
    ({ default: Admin } = await import("../../src/models/Admin.js"));
    ({ default: Suit } = await import("../../src/models/UnstitchedSuit.ts"));
    ({ default: Order } = await import("../../src/models/SuitOrder.ts"));
    ({ default: Movement } = await import("../../src/models/StockMovement.ts"));
    ({ default: Audit } = await import("../../src/models/AuditLog.ts"));
    ({ default: Return } = await import("../../src/models/SuitReturn.ts"));
    ({ default: Refund } = await import("../../src/models/SuitRefund.ts"));
    ({ default: Invoice } = await import("../../src/models/Invoice.ts"));
    ({ default: Settings } = await import("../../src/models/SiteSettings.ts"));
    ({ signAdminToken } = await import("../../src/lib/auth/session.ts"));
    ({ cloudinary: cloud } = await import("../../src/lib/cloudinary.ts"));
    cloud.uploader.destroy = async (id) => { destroyed.push(id); return { result: "ok" }; };
    R.orders = await import("../../src/app/api/admin/orders/route.ts");
    R.status = await import("../../src/app/api/admin/orders/[id]/status/route.ts");
    R.pay = await import("../../src/app/api/admin/orders/[id]/payment/route.ts");
    R.cancel = await import("../../src/app/api/admin/orders/[id]/cancel/route.ts");
    R.invoice = await import("../../src/app/api/admin/orders/[id]/invoice/route.ts");
    R.returns = await import("../../src/app/api/admin/returns/route.ts");
    R.retOne = await import("../../src/app/api/admin/returns/[id]/route.ts");
    R.retAct = await import("../../src/app/api/admin/returns/[id]/action/route.ts");
    R.refunds = await import("../../src/app/api/admin/refunds/route.ts");
    R.refOne = await import("../../src/app/api/admin/refunds/[id]/route.ts");
    R.refAct = await import("../../src/app/api/admin/refunds/[id]/action/route.ts");
    R.settings = await import("../../src/app/api/admin/settings/route.ts");
    S.invoiceSvc = await import("../../src/lib/invoiceService.ts");
    S.pdf = await import("../../src/lib/invoicePdf.ts");
    S.text = await import("../../src/lib/invoiceText.ts");
  });
  after(() => env?.stop());
  beforeEach(async () => { await env.reset(); destroyed.length = 0; });

  const user = async (role, permissions = {}) => {
    const a = await Admin.create({ name: role, email: `${role}${Math.random().toString(36).slice(2, 7)}@t.local`, password: await bcrypt.hash("x-not-used-1234", 4), role, permissions });
    return signAdminToken({ id: String(a._id), email: a.email, role: role === "staff" ? "staff" : "owner" });
  };
  const ALL = { products: true, orders: true, stock: true, returns: true, reports: true };
  let skuN = 0;
  const mkSuit = (over = {}) => Suit.create({ sku: `SR-${String(++skuN).padStart(4, "0")}`, name: `Suit ${skuN}`, originalPricePaise: 200000, salePricePaise: 150000, stock: 10, fabricImages: [{ url: img("s"), publicId: "sara-royal/ev-s" }], status: "published", ...over });
  const day = (offset) => new Date(Date.now() + 5.5 * 3600e3 + offset * 86400e3).toISOString().slice(0, 10);
  const call = async (route, method, url, id, token, body) => json(await route[method](await makeReq(url, { method, token, body, ip: ip() }), ctx(id)));

  async function setDelivered(owner, o, daysAgo) {
    await json(await R.status.POST(await makeReq(`/api/admin/orders/${o.id}/status`, { method: "POST", token: owner, body: { status: "shipped", courierName: "DTDC" } }), ctx(o.id)));
    const r = await json(await R.status.POST(await makeReq(`/api/admin/orders/${o.id}/status`, { method: "POST", token: owner, body: { status: "delivered", deliveredAt: day(-daysAgo) } }), ctx(o.id)));
    assert.equal(r.status, 200, JSON.stringify(r.body));
  }
  const newOrder = async (owner, { qty = 3, stock = 10, deliveredDaysAgo = 0, paid = true, suit } = {}) => {
    const s = suit ?? (await mkSuit({ stock }));
    const o = (await json(await R.orders.POST(await makeReq("/api/admin/orders", { method: "POST", token: owner, ip: ip(), body: { customer: { name: "Anita Sharma", phone: "9876543210", address: "House 12, Sector 5, Kharar", pincode: "140301" }, items: [{ suitId: String(s._id), quantity: qty }], paymentMethod: "upi", paymentStatus: paid ? "paid" : "pending", deliveryCharge: 80 } })))).body.data;
    if (deliveredDaysAgo !== null) await setDelivered(owner, o, deliveredDaysAgo);
    return { s, o };
  };
  const retBody = (o, s, over = {}) => ({ orderId: o.id, items: [{ suitId: String(s._id), quantity: 1 }], reasonType: "preference", unusedUncutConfirmed: true, ...over });
  const mkReturn = async (tok, o, s, over = {}) => json(await R.returns.POST(await makeReq("/api/admin/returns", { method: "POST", token: tok, body: retBody(o, s, over), ip: ip() })));
  const retAct = async (tok, id, body) => json(await R.retAct.POST(await makeReq(`/api/admin/returns/${id}/action`, { method: "POST", token: tok, body, ip: ip() }), ctx(id)));
  const refAct = async (tok, id, body) => json(await R.refAct.POST(await makeReq(`/api/admin/refunds/${id}/action`, { method: "POST", token: tok, body, ip: ip() }), ctx(id)));
  const recommend = async (tok, body) => json(await R.refunds.POST(await makeReq("/api/admin/refunds", { method: "POST", token: tok, body, ip: ip() })));
  const stockOf = async (s) => (await Suit.findById(s._id).lean()).stock;

  // ===================================================== RETURNS
  T("return: preference needs the unused/uncut confirmation; photos optional; shipping paid by customer; qty reserved", async () => {
    const owner = await user("owner");
    const { s, o } = await newOrder(owner, { qty: 3 });
    assert.equal((await mkReturn(owner, o, s, { unusedUncutConfirmed: false })).status, 400);
    const r = await mkReturn(owner, o, s, { reasonNote: "Colour not as expected" });
    assert.equal(r.status, 201);
    assert.match(r.body.data.returnId, /^SRR-\d{4}-0001$/);
    assert.deepEqual([r.body.data.withinWindow, r.body.data.returnShipping.paidBy, r.body.data.decision.status, r.body.data.resolution, r.body.data.restocked, r.body.data.photos.length], [true, "customer", "pending", "none", false, 0]);
    assert.equal((await Order.findById(o.id).lean()).items[0].returnedQuantity, 1);
    assert.equal(await stockOf(s), 7); // creating a return does not touch stock
  });

  T("return: wrong/defective items need photo evidence; shipping paid by the boutique; photo URLs validated", async () => {
    const owner = await user("owner");
    const { s, o } = await newOrder(owner);
    assert.equal((await mkReturn(owner, o, s, { reasonType: "defective", unusedUncutConfirmed: false })).status, 400);
    assert.equal((await mkReturn(owner, o, s, { reasonType: "wrong_item", photos: ["https://evil.example/x.jpg"] })).status, 400);
    const r = await mkReturn(owner, o, s, { reasonType: "defective", photos: [img(1), img(2), img(1)] });
    assert.equal(r.status, 201);
    assert.deepEqual([r.body.data.returnShipping.paidBy, r.body.data.photos.length], ["boutique", 2]);
  });

  T("return: only delivered orders; quantities capped by what was ordered, across several requests", async () => {
    const owner = await user("owner");
    const { s: s0, o: notDelivered } = await newOrder(owner, { deliveredDaysAgo: null });
    assert.equal((await mkReturn(owner, notDelivered, s0)).status, 409);
    const { s, o } = await newOrder(owner, { qty: 3 });
    const q = (n) => mkReturn(owner, o, s, { items: [{ suitId: String(s._id), quantity: n }] });
    assert.equal((await q(4)).status, 409);
    assert.equal((await q(2)).status, 201);
    assert.equal((await q(2)).status, 409); // only 1 left
    assert.equal((await q(1)).status, 201);
    assert.equal((await q(1)).status, 409);
    const other = await mkSuit();
    assert.equal((await mkReturn(owner, o, other)).status, 400); // suit not on this order
    assert.equal((await mkReturn(owner, { id: "507f1f77bcf86cd799439011" }, s)).status, 404);
  });

  T("return: 6 simultaneous requests for 1 unit each on a 3-unit line -> exactly 3 succeed", async () => {
    const owner = await user("owner");
    const { s, o } = await newOrder(owner, { qty: 3 });
    const rs = await Promise.all(Array.from({ length: 6 }, () => mkReturn(owner, o, s)));
    assert.equal(rs.filter((r) => r.status === 201).length, 3);
    assert.equal((await Order.findById(o.id).lean()).items[0].returnedQuantity, 3);
    assert.equal(await Return.countDocuments(), 3);
  });

  T("return window: 3 days from the delivery date; outside needs an exception note; before delivery refused", async () => {
    const owner = await user("owner");
    const { s, o } = await newOrder(owner, { qty: 5, deliveredDaysAgo: 6 });
    const atDay = (daysAfterDelivery, extra = {}) => mkReturn(owner, o, s, { requestedAt: day(-6 + daysAfterDelivery), ...extra });
    assert.equal((await atDay(0)).body.data.withinWindow, true);
    assert.equal((await atDay(3)).body.data.withinWindow, true); // day 3 is still inside
    const late = await atDay(4);
    assert.equal(late.status, 400); // day 4 needs an explanation
    assert.match(late.body.message, /exception/i);
    const ok = await atDay(5, { exceptionNote: "Customer was travelling, approved by owner" });
    assert.deepEqual([ok.status, ok.body.data.withinWindow], [201, false]);
    assert.equal((await atDay(-1)).status, 400); // before delivery
    assert.equal((await mkReturn(owner, o, s, { requestedAt: "2999-01-01" })).status, 400);
  });

  T("return: approval does NOT restore stock; rejection frees the reserved units; decisions apply once", async () => {
    const owner = await user("owner");
    const { s, o } = await newOrder(owner, { qty: 3 });
    const a = (await mkReturn(owner, o, s)).body.data;
    const b = (await mkReturn(owner, o, s)).body.data;
    assert.equal(await stockOf(s), 7);
    assert.equal((await retAct(owner, a.id, { action: "decide", decision: "approved" })).status, 200);
    assert.equal(await stockOf(s), 7); // still 7: approval alone never restores stock
    assert.equal((await retAct(owner, a.id, { action: "decide", decision: "approved" })).status, 409);
    assert.equal((await retAct(owner, a.id, { action: "decide", decision: "rejected", note: "changed" })).status, 409);
    assert.equal((await retAct(owner, b.id, { action: "decide", decision: "rejected" })).status, 400); // needs a reason
    const rejected = await retAct(owner, b.id, { action: "decide", decision: "rejected", note: "Item was cut" });
    assert.deepEqual([rejected.status, rejected.body.data.resolution], [200, "rejected"]);
    assert.equal((await Order.findById(o.id).lean()).items[0].returnedQuantity, 1); // b's unit released, a's still reserved
    assert.equal((await mkReturn(owner, o, s, { items: [{ suitId: String(s._id), quantity: 2 }] })).status, 201); // 2 free units again
  });

  T("restock: only after approval + physical receipt + resellable inspection, and exactly once", async () => {
    const owner = await user("owner");
    const { s, o } = await newOrder(owner, { qty: 3 });
    const r = (await mkReturn(owner, o, s, { items: [{ suitId: String(s._id), quantity: 2 }] })).body.data;
    const restock = () => retAct(owner, r.id, { action: "restock" });
    assert.equal((await restock()).status, 409); // not approved
    assert.equal((await retAct(owner, r.id, { action: "receive" })).status, 409); // approval first
    await retAct(owner, r.id, { action: "decide", decision: "approved" });
    assert.equal((await restock()).status, 409); // not received
    assert.equal((await retAct(owner, r.id, { action: "inspect", result: "resellable" })).status, 409); // inspect needs receipt
    assert.equal((await retAct(owner, r.id, { action: "receive" })).status, 200);
    assert.equal((await retAct(owner, r.id, { action: "receive" })).status, 409); // once
    assert.equal((await restock()).status, 409); // not inspected
    assert.equal((await retAct(owner, r.id, { action: "inspect", result: "maybe" })).status, 400);
    assert.equal(await stockOf(s), 7);
    assert.equal((await retAct(owner, r.id, { action: "inspect", result: "resellable", note: "Sealed, uncut" })).status, 200);
    assert.equal((await retAct(owner, r.id, { action: "inspect", result: "not_resellable" })).status, 409); // inspection is final
    assert.equal(await stockOf(s), 7); // still nothing restored before the explicit restock step
    const rs = await Promise.all(Array.from({ length: 5 }, restock));
    assert.equal(rs.filter((x) => x.status === 200).length, 1);
    assert.equal(await stockOf(s), 9); // 7 + 2, once
    assert.equal((await restock()).status, 409);
    assert.equal(await stockOf(s), 9);
    const mv = await Movement.find({ refType: "return", refId: r.returnId }).lean();
    assert.deepEqual(mv.map((m) => [m.reason, m.change, m.previousQty, m.resultingQty]), [["return_restock", 2, 7, 9]]);
    assert.equal((await Return.findById(r.id).lean()).restocked, true);
  });

  T("restock: a not-resellable item never goes back into stock", async () => {
    const owner = await user("owner");
    const { s, o } = await newOrder(owner);
    const r = (await mkReturn(owner, o, s)).body.data;
    await retAct(owner, r.id, { action: "decide", decision: "approved" });
    await retAct(owner, r.id, { action: "receive" });
    await retAct(owner, r.id, { action: "inspect", result: "not_resellable", note: "Stained" });
    assert.equal((await retAct(owner, r.id, { action: "restock" })).status, 409);
    assert.equal(await stockOf(s), 7);
    assert.equal(await Movement.countDocuments({ refType: "return" }), 0);
  });

  T("restock / exchange dispatch need the stock permission on top of returns", async () => {
    const owner = await user("owner");
    const { s, o } = await newOrder(owner);
    const r = (await mkReturn(owner, o, s)).body.data;
    const returnsOnly = await user("staff", { returns: true });
    await retAct(returnsOnly, r.id, { action: "decide", decision: "approved" });
    await retAct(returnsOnly, r.id, { action: "receive" });
    await retAct(returnsOnly, r.id, { action: "inspect", result: "resellable" });
    const denied = await retAct(returnsOnly, r.id, { action: "restock" });
    assert.equal(denied.status, 403);
    assert.equal(await stockOf(s), 7);
    const both = await user("staff", { returns: true, stock: true });
    assert.equal((await retAct(both, r.id, { action: "restock" })).status, 200);
    assert.equal(await stockOf(s), 8);
  });

  T("exchange: replacement stock is deducted once; shortage rolls back; resolution frozen afterwards", async () => {
    const owner = await user("owner");
    const { s, o } = await newOrder(owner);
    const repl = await mkSuit({ stock: 1 });
    const r = (await mkReturn(owner, o, s, { type: "exchange", reasonType: "defective", photos: [img(5)] })).body.data;
    await retAct(owner, r.id, { action: "decide", decision: "approved" });
    assert.equal((await retAct(owner, r.id, { action: "fulfil-exchange" })).status, 409); // no replacement chosen
    assert.equal((await retAct(owner, r.id, { action: "resolve", resolution: "exchange", exchange: { replacementSuitId: "nope", quantity: 1 } })).status, 400);
    assert.equal((await retAct(owner, r.id, { action: "resolve", resolution: "exchange", exchange: { replacementSuitId: String(repl._id), quantity: 2 } })).status, 200);
    assert.equal((await retAct(owner, r.id, { action: "fulfil-exchange" })).status, 409); // only 1 in stock
    assert.equal(await stockOf(repl), 1); // rolled back: nothing deducted
    assert.equal((await Return.findById(r.id).lean()).exchange.fulfilled, false);
    await retAct(owner, r.id, { action: "resolve", resolution: "exchange", exchange: { replacementSuitId: String(repl._id), quantity: 1 } });
    const rs = await Promise.all(Array.from({ length: 4 }, () => retAct(owner, r.id, { action: "fulfil-exchange" })));
    assert.equal(rs.filter((x) => x.status === 200).length, 1);
    assert.equal(await stockOf(repl), 0);
    assert.equal(await Movement.countDocuments({ refType: "return", reason: "exchange" }), 1);
    assert.equal((await retAct(owner, r.id, { action: "resolve", resolution: "refund" })).status, 409);
  });

  T("return: shipping details (https only), extra evidence photos and notes; history kept", async () => {
    const owner = await user("owner");
    const { s, o } = await newOrder(owner);
    const r = (await mkReturn(owner, o, s)).body.data;
    assert.equal((await retAct(owner, r.id, { action: "shipping", courier: "India Post", trackingNumber: "RP123", trackingUrl: "javascript:alert(1)" })).status, 400);
    const ok = await retAct(owner, r.id, { action: "shipping", courier: "India Post", trackingNumber: "RP123", trackingUrl: "https://www.indiapost.gov.in/t/RP123" });
    assert.deepEqual([ok.status, ok.body.data.returnShipping.courier, ok.body.data.returnShipping.paidBy], [200, "India Post", "customer"]);
    assert.equal((await retAct(owner, r.id, { action: "photos", photos: [img(7), img(8)] })).body.data.photos.length, 2);
    assert.equal((await retAct(owner, r.id, { action: "photos", photos: ["http://x.test/a.jpg"] })).status, 400);
    assert.equal((await retAct(owner, r.id, { action: "note", note: "Customer will courier it Friday" })).status, 200);
    assert.equal((await retAct(owner, r.id, { action: "bogus" })).status, 400);
    const detail = await call(R.retOne, "GET", `/api/admin/returns/${r.id}`, r.id, owner);
    assert.ok(detail.body.data.history.length >= 4);
    assert.equal((await Audit.countDocuments({ action: /^return\./ })) >= 4, true);
  });

  T("permissions: returns & refunds endpoints need the returns permission; refund money steps are Owner-only", async () => {
    const owner = await user("owner");
    const { s, o } = await newOrder(owner);
    const ret = (await mkReturn(owner, o, s)).body.data;
    await retAct(owner, ret.id, { action: "decide", decision: "approved" });
    const none = await user("staff", {});
    const noReturns = await user("staff", { products: true, orders: true, stock: true, reports: true });
    const fr = (await recommend(owner, { orderId: o.id, amount: 500, method: "upi" })).body.data;
    const probes = {
      listReturns: (t) => call(R.returns, "GET", "/api/admin/returns", "x", t),
      createReturn: (t) => mkReturn(t, o, s),
      getReturn: (t) => call(R.retOne, "GET", `/api/admin/returns/${ret.id}`, ret.id, t),
      actReturn: (t) => retAct(t, ret.id, { action: "note", note: "hello there" }),
      listRefunds: (t) => call(R.refunds, "GET", "/api/admin/refunds", "x", t),
      recommend: (t) => recommend(t, { orderId: o.id, amount: 100, method: "upi" }),
      getRefund: (t) => call(R.refOne, "GET", `/api/admin/refunds/${fr.id}`, fr.id, t),
    };
    for (const [name, p] of Object.entries(probes)) {
      assert.equal((await p(undefined)).status, 401, `${name} anonymous`);
      assert.equal((await p(none)).status, 403, `${name} none`);
      assert.equal((await p(noReturns)).status, 403, `${name} no returns permission`);
    }
    // Owner-only refund actions: staff with EVERY permission is still refused
    const staffAll = await user("staff", ALL);
    for (const action of ["approve", "reject", "process", "complete", "fail"]) {
      assert.equal((await refAct(staffAll, fr.id, { action, note: "try", utr: "UTR123456", amount: 500 })).status, 403, `staff ${action}`);
      assert.equal((await refAct(undefined, fr.id, { action })).status, 401, `anonymous ${action}`);
    }
    const afterAttempts = await Refund.findById(fr.id).lean();
    assert.deepEqual([afterAttempts.approval.status, afterAttempts.status, afterAttempts.reserved], ["recommended", "pending", false]);
    assert.equal((await Order.findById(o.id).lean()).refundCommittedPaise, 0);
  });

  // ===================================================== REFUNDS
  T("refund: only paid orders; amount must be positive and within the order total; method validated; return-linked rules", async () => {
    const owner = await user("owner");
    const { o: unpaid } = await newOrder(owner, { paid: false });
    assert.equal((await recommend(owner, { orderId: unpaid.id, amount: 100, method: "upi" })).status, 409);
    const { s, o } = await newOrder(owner, { qty: 2 });
    const total = o.totalPaise / 100;
    for (const bad of [{ amount: 0 }, { amount: -5 }, { amount: "abc" }, { amount: 1.234 }, { amount: total + 1 }, { method: "cash" }, { method: undefined }, { orderId: "nope" }]) {
      assert.equal((await recommend(owner, { orderId: o.id, amount: 100, method: "upi", ...bad })).status, 400, JSON.stringify(bad));
    }
    assert.equal((await recommend(owner, { orderId: "507f1f77bcf86cd799439011", amount: 100, method: "upi" })).status, 404);
    assert.equal((await recommend(owner, { orderId: o.id, amount: total, method: "bank_transfer" })).status, 201);
    const ret = (await mkReturn(owner, o, s)).body.data;
    assert.equal((await recommend(owner, { orderId: o.id, returnId: ret.id, amount: 10, method: "upi" })).status, 409); // return not approved yet
    await retAct(owner, ret.id, { action: "decide", decision: "approved" });
    const linked = await recommend(owner, { orderId: o.id, returnId: ret.id, amount: 10, method: "upi" });
    assert.deepEqual([linked.status, linked.body.data.returnId], [201, ret.returnId]);
    const { o: o2 } = await newOrder(owner);
    assert.equal((await recommend(owner, { orderId: o2.id, returnId: ret.id, amount: 10, method: "upi" })).status, 400); // return of another order
  });

  T("refund: staff recommend; Owner approves (reserving the amount), then marks processing, then completes with a UTR", async () => {
    const owner = await user("owner");
    const staff = await user("staff", { returns: true });
    const { o } = await newOrder(owner, { qty: 2 });
    const rec = await recommend(staff, { orderId: o.id, amount: 1000, method: "upi", notes: "Customer returned 1 suit" });
    assert.equal(rec.status, 201);
    assert.match(rec.body.data.refundId, /^SRF-\d{4}-0001$/);
    assert.deepEqual([rec.body.data.approval.status, rec.body.data.status], ["recommended", "pending"]);
    assert.equal((await Order.findById(o.id).lean()).refundCommittedPaise, 0); // recommending reserves nothing
    const id = rec.body.data.id;
    assert.equal((await refAct(owner, id, { action: "complete", utr: "UTR123456" })).status, 409); // approval first
    assert.equal((await refAct(owner, id, { action: "process" })).status, 409);
    const ap = await refAct(owner, id, { action: "approve", amount: 900, note: "Approved less 100 for delivery" });
    assert.deepEqual([ap.status, ap.body.data.amountPaise, ap.body.data.approval.status, ap.body.data.reserved], [200, 90000, "approved", true]);
    assert.equal((await Order.findById(o.id).lean()).refundCommittedPaise, 90000);
    assert.equal((await refAct(owner, id, { action: "approve" })).status, 409); // no double reservation
    assert.equal((await Order.findById(o.id).lean()).refundCommittedPaise, 90000);
    assert.equal((await refAct(owner, id, { action: "process" })).body.data.status, "processing");
    assert.equal((await refAct(owner, id, { action: "complete", utr: "x" })).status, 400);
    assert.equal((await refAct(owner, id, { action: "complete", utr: "UTR 123" })).status, 400);
    assert.equal((await refAct(owner, id, { action: "complete", utr: "UTR123456", refundDate: "2999-01-01" })).status, 400);
    const done = await refAct(owner, id, { action: "complete", utr: "UTR123456789", refundDate: day(0) });
    assert.deepEqual([done.status, done.body.data.status, done.body.data.utr], [200, "completed", "UTR123456789"]);
    assert.equal((await refAct(owner, id, { action: "fail", note: "too late" })).status, 409); // completed is final
    assert.equal((await refAct(owner, id, { action: "process" })).status, 409);
    assert.equal(done.body.data.history.map((h) => h.action).join(), "recommended,approved,processing,completed");
    assert.equal(await Audit.countDocuments({ action: /^refund\./ }), 4);
  });

  T("refund: completion happens once even with 5 simultaneous requests", async () => {
    const owner = await user("owner");
    const { o } = await newOrder(owner);
    const id = (await recommend(owner, { orderId: o.id, amount: 500, method: "upi" })).body.data.id;
    await refAct(owner, id, { action: "approve" });
    const rs = await Promise.all(Array.from({ length: 5 }, () => refAct(owner, id, { action: "complete", utr: "UTR55555555" })));
    assert.equal(rs.filter((r) => r.status === 200).length, 1);
    assert.equal(rs.filter((r) => r.status === 409).length, 4);
    assert.equal((await Refund.findById(id).lean()).history.filter((h) => h.action === "completed").length, 1);
  });

  T("refund: can never exceed the refundable amount — sequential and 2 concurrent approvals of 60% each", async () => {
    const owner = await user("owner");
    const { o } = await newOrder(owner, { qty: 2 }); // total = 2*1500 + 80 = 3080
    const total = o.totalPaise / 100;
    const sixty = Math.round(total * 0.6);
    const a = (await recommend(owner, { orderId: o.id, amount: sixty, method: "upi" })).body.data;
    const b = (await recommend(owner, { orderId: o.id, amount: sixty, method: "upi" })).body.data; // both recommended while nothing is reserved
    const rs = await Promise.all([refAct(owner, a.id, { action: "approve" }), refAct(owner, b.id, { action: "approve" })]);
    assert.equal(rs.filter((r) => r.status === 200).length, 1);
    assert.equal(rs.filter((r) => r.status === 409).length, 1);
    const committed = (await Order.findById(o.id).lean()).refundCommittedPaise;
    assert.equal(committed, sixty * 100);
    assert.ok(committed <= o.totalPaise);
    const loserId = rs[0].status === 200 ? b.id : a.id;
    const loser = await Refund.findById(loserId).lean();
    assert.deepEqual([loser.approval.status, loser.reserved], ["recommended", false]); // rolled back cleanly
    assert.equal((await recommend(owner, { orderId: o.id, amount: total - sixty + 1, method: "upi" })).status, 400); // beyond what is left
    assert.equal((await refAct(owner, loserId, { action: "approve", amount: total })).status, 409); // authorising more than is left
    assert.equal((await refAct(owner, loserId, { action: "approve", amount: total - sixty })).status, 200); // exactly the rest is fine
    assert.equal((await Order.findById(o.id).lean()).refundCommittedPaise, o.totalPaise);
    assert.equal((await recommend(owner, { orderId: o.id, amount: 1, method: "upi" })).status, 400); // fully refunded
  });

  T("refund: partial refunds add up; failing one releases its reservation exactly once", async () => {
    const owner = await user("owner");
    const { o } = await newOrder(owner, { qty: 2 });
    const mk = async (amount) => (await recommend(owner, { orderId: o.id, amount, method: "bank_transfer" })).body.data;
    const a = await mk(1000), b = await mk(500);
    await refAct(owner, a.id, { action: "approve" }); await refAct(owner, b.id, { action: "approve" });
    assert.equal((await Order.findById(o.id).lean()).refundCommittedPaise, 150000);
    assert.equal((await refAct(owner, b.id, { action: "fail" })).status, 400); // reason required
    const failed = await Promise.all(Array.from({ length: 3 }, () => refAct(owner, b.id, { action: "fail", note: "Bank rejected the transfer" })));
    assert.equal(failed.filter((r) => r.status === 200).length, 1);
    assert.equal((await Order.findById(o.id).lean()).refundCommittedPaise, 100000); // released once, not three times
    assert.equal((await Refund.findById(b.id).lean()).reserved, false);
    assert.equal((await refAct(owner, b.id, { action: "complete", utr: "UTR999999" })).status, 409); // failed refunds cannot be completed
    assert.equal((await recommend(owner, { orderId: o.id, amount: 500, method: "upi" })).status, 201); // the released amount can be refunded again
  });

  T("refund: rejecting needs a reason, is final, and reserves nothing; payment cannot be reverted once refunds exist", async () => {
    const owner = await user("owner");
    const { o } = await newOrder(owner);
    const id = (await recommend(owner, { orderId: o.id, amount: 200, method: "upi" })).body.data.id;
    assert.equal((await refAct(owner, id, { action: "reject" })).status, 400);
    assert.equal((await refAct(owner, id, { action: "reject", note: "Not eligible" })).status, 200);
    assert.equal((await refAct(owner, id, { action: "approve" })).status, 409);
    assert.equal((await refAct(owner, id, { action: "reject", note: "again please" })).status, 409);
    assert.equal((await Order.findById(o.id).lean()).refundCommittedPaise, 0);
    const id2 = (await recommend(owner, { orderId: o.id, amount: 200, method: "upi" })).body.data.id;
    await refAct(owner, id2, { action: "approve" });
    const revert = await json(await R.pay.POST(await makeReq(`/api/admin/orders/${o.id}/payment`, { method: "POST", token: owner, body: { paymentStatus: "pending" } }), ctx(o.id)));
    assert.equal(revert.status, 409);
  });

  // ===================================================== INVOICES
  const getInvoice = async (tok, o, qs = "") => R.invoice.GET(await makeReq(`/api/admin/orders/${o.id}/invoice${qs}`, { token: tok, ip: ip() }), ctx(o.id));
  // PDFs now embed fonts (glyph ids, not plain text), so content is checked by re-rendering the STORED invoice with the
  // renderer's onText hook, which receives every line that is drawn.
  const storedText = async (orderId, opts = {}) => {
    const inv = await Invoice.findOne({ orderRef: orderId }).select("+logo").lean();
    const lines = [];
    await S.pdf.renderInvoicePdf({ invoiceId: inv.invoiceId, orderId: inv.orderId, issuedAt: inv.issuedAt, snapshot: inv.snapshot }, { onText: (l) => lines.push(l), ...opts });
    return lines.join("\n");
  };
  const setSettings = async (owner, body) => json(await R.settings.PUT(await makeReq("/api/admin/settings", { method: "PUT", token: owner, body })));

  T("invoice: first download issues a numbered invoice (PDF), later downloads reuse it; one invoice per order even concurrently", async () => {
    const owner = await user("owner");
    await setSettings(owner, { boutiqueName: "Sara Royal Boutique", businessAddress: "SCO 12, Kharar, Punjab", contactNumber: "+91 99888 54440", email: "hello@example.test", invoiceFooter: "Thank you for shopping with us" });
    const { o } = await newOrder(owner, { qty: 2 });
    const rs = await Promise.all(Array.from({ length: 5 }, () => getInvoice(owner, o)));
    assert.ok(rs.every((r) => r.status === 200));
    assert.equal(rs[0].headers.get("content-type"), "application/pdf");
    assert.match(rs[0].headers.get("content-disposition"), /attachment; filename="SRI-\d{4}-\d{4}\.pdf"/);
    assert.equal(rs[0].headers.get("cache-control"), "private, no-store");
    const bytes = Buffer.from(await rs[0].arrayBuffer());
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
    assert.equal(await Invoice.countDocuments(), 1);
    assert.equal((await Order.findById(o.id).lean()).invoiceId, (await Invoice.findOne().lean()).invoiceId);
    const again = await getInvoice(owner, o, "?inline=1");
    assert.match(again.headers.get("content-disposition"), /^inline;/);
    assert.equal(await Invoice.countDocuments(), 1);
    assert.equal(await Audit.countDocuments({ action: "invoice.downloaded" }), 6);
  });

  T("invoice content: business, customer, items, FROZEN prices, subtotal/delivery/total, payment method, footer, no GST by default", async () => {
    const owner = await user("owner");
    await setSettings(owner, { boutiqueName: "Sara Royal Boutique", businessAddress: "SCO 12, Kharar", contactNumber: "+91 99888 54440", email: "hello@example.test", invoiceFooter: "Thank you for shopping with us" });
    const { s, o } = await newOrder(owner, { qty: 2 });
    await Suit.updateOne({ _id: s._id }, { $set: { salePricePaise: 999900, name: "Renamed later" } }); // catalogue changes after the order
    assert.equal(await Invoice.findOne({ orderRef: o.id }).lean(), null); // not issued until requested
    const res = await getInvoice(owner, o);
    assert.equal(res.status, 200);
    assert.equal(Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
    const text = await storedText(o.id);
    for (const part of ["Sara Royal Boutique", "SCO 12, Kharar", "99888 54440", "hello@example.test", "INVOICE", "SRI-", o.orderId, "Anita Sharma", "House 12, Sector 5, Kharar", "PIN: 140301", s.sku, "₹1,500", "₹3,000", "₹80", "₹3,080", "Prepaid UPI", "Thank you for shopping with us"]) assert.ok(text.includes(part), `missing "${part}"`);
    assert.ok(!text.includes("Renamed later") && !text.includes("9,999"), "must use the frozen name and price");
    assert.ok(!/GST|TAX INVOICE|GSTIN/i.test(text), "GST is OFF by default: no GST wording at all");
  });

  T("invoice: later settings changes never rewrite an issued invoice, new invoices use the new settings", async () => {
    const owner = await user("owner");
    await setSettings(owner, { boutiqueName: "Old Name", businessAddress: "Old Address", invoiceFooter: "Old footer" });
    const { o: o1 } = await newOrder(owner);
    await getInvoice(owner, o1);
    const before = await Invoice.findOne({ orderRef: o1.id }).lean();
    const first = await storedText(o1.id);
    assert.ok(first.includes("Old Name") && first.includes("Old Address"));
    await setSettings(owner, { boutiqueName: "New Name", businessAddress: "New Address", invoiceFooter: "New footer", gst: { enabled: true, gstin: "03ABCDE1234F1Z5", legalName: "New Legal" } });
    assert.equal((await getInvoice(owner, o1)).status, 200); // re-download
    const after = await Invoice.findOne({ orderRef: o1.id }).lean();
    assert.deepEqual(JSON.parse(JSON.stringify(after.snapshot)), JSON.parse(JSON.stringify(before.snapshot)), "the stored snapshot never changes");
    const reDownload = await storedText(o1.id);
    assert.ok(reDownload.includes("Old Name") && reDownload.includes("Old Address") && reDownload.includes("Old footer"));
    assert.ok(!reDownload.includes("New Name") && !/GSTIN/.test(reDownload), "old invoice must not pick up the new name or GST");
    const { o: o2 } = await newOrder(owner);
    await getInvoice(owner, o2);
    const second = await storedText(o2.id);
    assert.ok(second.includes("New Name") && second.includes("New Address") && second.includes("GSTIN: 03ABCDE1234F1Z5") && second.includes("New Legal"));
  });

  T("invoice GST: enabled adds only the GSTIN line (no assumed rate, no extra charge); totals identical", async () => {
    const owner = await user("owner");
    const { o: off } = await newOrder(owner, { qty: 1 });
    await getInvoice(owner, off); // issued while GST is still OFF (the default)
    await setSettings(owner, { gst: { enabled: true, gstin: "03ABCDE1234F1Z5" } });
    const { o: on } = await newOrder(owner, { qty: 1 });
    await getInvoice(owner, on);
    const a = S.text.invoiceContent(await Invoice.findOne({ orderRef: off.id }).lean());
    const b = S.text.invoiceContent(await Invoice.findOne({ orderRef: on.id }).lean());
    assert.equal(a.gstLine, "");
    assert.equal(b.gstLine, "GSTIN: 03ABCDE1234F1Z5");
    assert.deepEqual(a.totals.map((t) => t[0]), ["Products subtotal", "Delivery charges", "Invoice total"]);
    assert.deepEqual(b.totals, a.totals); // same lines and amounts: GST never adds a charge
    assert.equal(a.title, "INVOICE");
    assert.equal(b.title, "INVOICE");
  });

  T("invoice: cancelled orders cannot be newly invoiced; an existing invoice shows a cancelled banner", async () => {
    const owner = await user("owner");
    const { o: a } = await newOrder(owner, { deliveredDaysAgo: null });
    await json(await R.cancel.POST(await makeReq(`/api/admin/orders/${a.id}/cancel`, { method: "POST", token: owner, body: { reason: "Customer cancelled" } }), ctx(a.id)));
    assert.equal((await getInvoice(owner, a)).status, 409);
    assert.equal(await Invoice.countDocuments(), 0);
    const { o: b } = await newOrder(owner, { deliveredDaysAgo: null });
    assert.equal((await getInvoice(owner, b)).status, 200);
    await json(await R.cancel.POST(await makeReq(`/api/admin/orders/${b.id}/cancel`, { method: "POST", token: owner, body: { reason: "Returned to sender" } }), ctx(b.id)));
    const res = await getInvoice(owner, b);
    assert.equal(res.status, 200);
    assert.equal(Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
    assert.ok((await storedText(b.id, { cancelled: true })).includes("ORDER CANCELLED"));
  });

  T("invoice: only the orders permission may download (401 / 403 otherwise); unknown order 404", async () => {
    const owner = await user("owner");
    const { o } = await newOrder(owner);
    assert.equal((await getInvoice(undefined, o)).status, 401);
    assert.equal((await getInvoice(await user("staff", { returns: true, reports: true, products: true, stock: true }), o)).status, 403);
    assert.equal((await getInvoice(await user("staff", { orders: true }), o)).status, 200);
    assert.equal((await getInvoice(owner, { id: "507f1f77bcf86cd799439011" })).status, 404);
    assert.equal(await Invoice.countDocuments(), 1);
  });

  const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  T("invoice logo: bytes are frozen into the invoice; a failing logo download refuses (no half-branded invoice)", async () => {
    const owner = await user("owner");
    await Settings.create({ key: "main", boutiqueName: "Logo Shop", logo: { url: "https://res.cloudinary.com/demo/image/upload/v1/sara-royal/logo-a.png", publicId: "sara-royal/logo-a" } });
    const { o } = await newOrder(owner);
    const okFetch = async (url) => { assert.match(url, /f_png,w_400,c_limit/); return new Response(PNG, { status: 200 }); };
    const issued = await S.invoiceSvc.getOrIssueInvoice(o.id, { id: "u", email: "u@t" }, { fetchImpl: okFetch });
    assert.ok(issued.logo && (issued.logo.buffer ?? issued.logo).length === PNG.length);
    // logo replaced afterwards: the issued invoice keeps the old bytes
    await Settings.updateOne({ key: "main" }, { $set: { "logo.url": "https://res.cloudinary.com/demo/image/upload/v1/sara-royal/logo-b.png" } });
    const again = await S.invoiceSvc.getOrIssueInvoice(o.id, { id: "u", email: "u@t" }, { fetchImpl: async () => { throw new Error("must not refetch"); } });
    assert.equal(again.invoiceId, issued.invoiceId);
    // a new order with an unreachable logo: refused, nothing issued
    const { o: o2 } = await newOrder(owner);
    await assert.rejects(S.invoiceSvc.getOrIssueInvoice(o2.id, { id: "u", email: "u@t" }, { fetchImpl: async () => new Response("nope", { status: 500 }) }), /Could not load the invoice logo/);
    await assert.rejects(S.invoiceSvc.getOrIssueInvoice(o2.id, { id: "u", email: "u@t" }, { fetchImpl: async () => new Response("<html>not an image</html>", { status: 200 }) }), /Could not load the invoice logo/);
    assert.equal(await Invoice.countDocuments({ orderRef: o2.id }), 0);
    const pdf = await S.pdf.renderInvoicePdf({ invoiceId: issued.invoiceId, orderId: issued.orderId, issuedAt: issued.issuedAt, snapshot: issued.snapshot }, { logo: Buffer.from(issued.logo.buffer ?? issued.logo) });
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    assert.ok(pdf.length > 1500);
  });

  const HAVE_POPPLER = spawnSync("pdftotext", ["-v"]).status !== null && spawnSync("pdftotext", ["-v"]).error === undefined;
  const snap = (name, extra = {}) => ({ business: { name: "B" }, gst: { enabled: false }, customer: { name, phone: "919876543210", address: "x y z", pincode: "140301" }, items: [{ sku: "SR-1", name: "Item", quantity: 1, unitPricePaise: 1000, lineTotalPaise: 1000 }], subtotalPaise: 1000, deliveryChargePaise: 0, totalPaise: 1000, paymentMethod: "cod", ...extra });
  const render = (snapshot, opts = {}) => S.pdf.renderInvoicePdf({ invoiceId: "SRI-2026-0099", orderId: "SRO-2026-0099", issuedAt: new Date(), snapshot }, opts);

  T("invoice Unicode: Hindi, Punjabi and English names (including mixed scripts and common Punjabi surnames) render with embedded fonts", async () => {
    const names = ["Anita Sharma", "अनीता शर्मा", "ਅਨੀਤਾ ਕੌਰ", "ਹਰਪ੍ਰੀਤ ਸਿੰਘ", "ਗੁਰਪ੍ਰੀਤ ਸਿੰਘ", "ਸੁਖਵਿੰਦਰ ਕੌਰ", "प्रिया कृष्ण", "ਅਨੀਤਾ / अनीता / Anita"];
    for (const name of names) {
      const lines = [];
      const pdf = await render(snap(name), { onText: (l) => lines.push(l), compress: false });
      assert.equal(pdf.subarray(0, 5).toString(), "%PDF-", name);
      assert.ok(lines.some((l) => l.includes(name)), `drawn text must contain the name unchanged: ${name}`);
      assert.ok(!lines.some((l) => l.includes(name) && l.includes("?")), `no "?" substitution for ${name}`);
    }
    const bytes = (await render(snap("ਹਰਪ੍ਰੀਤ ਸਿੰਘ / अनीता / Anita"), { compress: false })).toString("latin1");
    for (const font of ["NotoSansGurmukhi", "NotoSansDevanagari", "NotoSans-"]) assert.ok(bytes.includes(font), `${font} is embedded`);
    assert.ok(!bytes.includes("Helvetica"), "the built-in Latin-only font is no longer used");
  });

  T("invoice Unicode: addresses, item names, footer and legal name in several scripts; rupee sign; newlines", async () => {
    const lines = [];
    await render(snap("ਗੁਰਪ੍ਰੀਤ ਸਿੰਘ", { business: { name: "ਸਾਰਾ ਰਾਇਲ ਬੁਟੀਕ", address: "ਖਰੜ, ਪੰਜਾਬ", footer: "धन्यवाद / ਧੰਨਵਾਦ / Thank you" }, gst: { enabled: true, gstin: "03ABCDE1234F1Z5", legalName: "सारा रॉयल" }, customer: { name: "अनीता", phone: "919876543210", address: "मकान 12\nਮਕਾਨ ੧੨\nHouse 12", pincode: "140301" }, items: [{ sku: "SR-1", name: "गुलाबी सूट ਗੁਲਾਬੀ", quantity: 1, unitPricePaise: 150000, lineTotalPaise: 150000 }], subtotalPaise: 150000, totalPaise: 150000 }), { onText: (l) => lines.push(l) });
    const text = lines.join("\n");
    for (const part of ["ਸਾਰਾ ਰਾਇਲ ਬੁਟੀਕ", "ਖਰੜ, ਪੰਜਾਬ", "धन्यवाद / ਧੰਨਵਾਦ / Thank you", "सारा रॉयल", "मकान 12", "ਮਕਾਨ ੧੨", "House 12", "गुलाबी सूट ਗੁਲਾਬੀ", "₹1,500"]) assert.ok(text.includes(part), `missing ${part}`);
  });

  T("invoice Unicode: scripts without an embedded font become '?' (never a crash or an empty box)", async () => {
    const lines = [];
    const pdf = await render(snap("Ali مرحبا 你好 Anita"), { onText: (l) => lines.push(l) });
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    const line = lines.find((l) => l.startsWith("Ali"));
    assert.ok(line && line.includes("Anita") && !line.includes("مرحبا") && line.includes("?"), line);
  });

  T("invoice Unicode: very long unbroken names and 60-line invoices wrap without crashing or splitting characters", async () => {
    const lines = [];
    const long = "ਗੁਰਪ੍ਰੀਤ".repeat(40);
    const pdf = await render(snap(long), { onText: (l) => lines.push(l) });
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    assert.equal(lines.join("").replace(/\s/g, "").includes(long), true, "all characters present, in order, across the wrapped lines");
    const many = Array.from({ length: 60 }, (_, i) => ({ sku: `SR-${i}`, name: `वस्त्र ${i} ਕੱਪੜਾ item with a fairly long description to wrap around`, quantity: 1, unitPricePaise: 1000, lineTotalPaise: 1000 }));
    const big = await render(snap("A", { items: many, subtotalPaise: 60000, totalPaise: 60000 }), { compress: false });
    assert.ok((big.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length >= 2, "continues on a second page");
  });

  T("invoice Unicode: text can be read back from the PDF itself (poppler) for English, Hindi and Punjabi", async (t) => {
    if (!HAVE_POPPLER) return t.skip("pdftotext (poppler-utils) not installed");
    const pdf = await render(snap("Anita ਅਨੀਤਾ ਕੌਰ"), {});
    const out = spawnSync("pdftotext", ["-layout", "-", "-"], { input: pdf, encoding: "utf8" }).stdout;
    assert.ok(out.includes("Anita") && out.includes("ਅਨੀਤਾ ਕੌਰ"), out.slice(0, 400));
    const hi = spawnSync("pdftotext", ["-layout", "-", "-"], { input: await render(snap("अनीता"), {}), encoding: "utf8" }).stdout;
    assert.ok(hi.includes("अनीता"), hi.slice(0, 400));
  });

  T("invoice Unicode: the invoice route itself works for a Hindi/Punjabi customer", async () => {
    const owner = await user("owner");
    const { o } = await newOrder(owner);
    await Order.updateOne({ _id: o.id }, { $set: { "customer.name": "ਹਰਪ੍ਰੀਤ ਸਿੰਘ / अनीता शर्मा", "customer.address": "ਮਕਾਨ ੧੨, ਖਰੜ\nमकान 12, खरड़" } });
    const res = await getInvoice(owner, o);
    assert.equal(res.status, 200);
    const bytes = Buffer.from(await res.arrayBuffer());
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
    assert.ok((await storedText(o.id)).includes("ਹਰਪ੍ਰੀਤ ਸਿੰਘ / अनीता शर्मा"));
  });

  T("invoice fonts: all six font files and the license ship with the project", async () => {
    const dir = path.join(process.cwd(), "assets", "fonts");
    for (const f of ["NotoSans-Regular.ttf", "NotoSans-Bold.ttf", "NotoSansDevanagari-Regular.ttf", "NotoSansDevanagari-Bold.ttf", "NotoSansGurmukhi-Regular.ttf", "NotoSansGurmukhi-Bold.ttf", "OFL.txt"]) assert.ok(fs.statSync(path.join(dir, f)).size > 3000, f);
    const next = fs.readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");
    assert.match(next, /outputFileTracingIncludes[\s\S]*assets\/fonts/, "serverless bundles must include the fonts");
  });

  T("settings: replacing the invoice logo deletes the old file from Cloudinary only when nothing else uses it", async () => {
    const owner = await user("owner");
    const L = (n) => `https://res.cloudinary.com/demo/image/upload/v1/sara-royal/${n}.png`;
    await setSettings(owner, { logo: { url: L("lg-1") } });
    await Suit.create({ sku: "SR-8001", name: "Uses logo-2", originalPricePaise: 1, salePricePaise: 1, fabricImages: [{ url: L("lg-2"), publicId: "sara-royal/lg-2" }] });
    assert.equal((await setSettings(owner, { logo: { url: L("lg-2") } })).status, 200);
    assert.deepEqual(destroyed, ["sara-royal/lg-1"]); // lg-1 was only the logo -> deleted
    destroyed.length = 0;
    assert.equal((await setSettings(owner, { logo: null })).status, 200);
    assert.deepEqual(destroyed, []); // lg-2 is still used by a suit -> kept
    assert.equal((await setSettings(owner, { logo: { url: "javascript:alert(1)" } })).status, 400);
  });
}
