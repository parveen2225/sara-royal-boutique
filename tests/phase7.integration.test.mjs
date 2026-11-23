import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { startTestEnv, makeReq, json } from "./helpers/testEnv.mjs";

let seq = 0;
let env, Admin, Suit, Order, Refund, Audit, signAdminToken, R = {};
const ctx = (id) => ({ params: Promise.resolve({ id }) });
let ipN = 0; const ip = () => `10.9.${Math.floor(++ipN / 250)}.${ipN % 250}`;

before(async () => {
  env = await startTestEnv();
  ({ default: Admin } = await import("../src/models/Admin.js"));
  ({ default: Suit } = await import("../src/models/UnstitchedSuit.ts"));
  ({ default: Order } = await import("../src/models/SuitOrder.ts"));
  ({ default: Refund } = await import("../src/models/SuitRefund.ts"));
  ({ default: Audit } = await import("../src/models/AuditLog.ts"));
  ({ signAdminToken } = await import("../src/lib/auth/session.ts"));
  R.dash = await import("../src/app/api/admin/reports/dashboard/route.ts");
  R.exp = await import("../src/app/api/admin/reports/export/route.ts");
  R.staff = await import("../src/app/api/admin/staff/route.ts");
  R.staffOne = await import("../src/app/api/admin/staff/[id]/route.ts");
  R.audit = await import("../src/app/api/admin/audit/route.ts");
  R.orders = await import("../src/app/api/admin/orders/route.ts");
  R.login = await import("../src/app/api/auth/login/route.ts");
  R.me = await import("../src/app/api/auth/me/route.ts");
  R.pw = await import("../src/app/api/auth/change-password/route.ts");
});
after(() => env?.stop());
beforeEach(async () => { await env.reset(); seq = 0; });

const PW = "Correct-Horse-Battery-9";
const user = async (role, permissions = {}, email) => {
  const a = await Admin.create({ name: role, email: email ?? `${role}${Math.random().toString(36).slice(2, 7)}@t.local`, password: await bcrypt.hash(PW, 4), role, permissions });
  return { token: signAdminToken({ id: String(a._id), email: a.email, role: role === "staff" ? "staff" : "owner" }), id: String(a._id), email: a.email };
};
const ALL = { products: true, orders: true, stock: true, returns: true, reports: true };
const istDate = (offsetDays, hour = 12) => { const t = new Date(Date.now() + 5.5 * 3600e3); t.setUTCHours(hour, 0, 0, 0); return new Date(t.getTime() + offsetDays * 86400e3 - 5.5 * 3600e3); };
const ymd = (d) => new Date(d.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);

const insertOrder = async ({ status, method = "cod", paid = false, sub, del = 0, at, name = "Anita Sharma", phone = "919876543210" }) => {
  const n = String(++seq).padStart(4, "0");
  const doc = { orderId: `SRO-2026-${n}`, customer: { name, phone, address: "Secret Lane 5, Kharar", pincode: "140301" }, items: [{ suitId: new env.mongoose.Types.ObjectId(), sku: `SR-${n}`, name: `Suit ${n}`, unitPricePaise: sub * 100, quantity: 1, lineTotalPaise: sub * 100 }], subtotalPaise: sub * 100, deliveryChargePaise: del * 100, totalPaise: (sub + del) * 100, paymentMethod: method, paymentStatus: paid ? "paid" : "pending", status, stockDeducted: status !== "cancelled", createdAt: at, updatedAt: at, statusHistory: [], __v: 0 };
  const r = await Order.collection.insertOne(doc);
  return { ...doc, _id: r.insertedId };
};
const insertRefund = async (order, { amount, status, approval = "approved", refundDate, createdAt = new Date(), method = "upi", utr = "" }) => {
  const n = String(++seq).padStart(4, "0");
  await Refund.collection.insertOne({ refundId: `SRF-2026-${n}`, orderRef: order._id, orderId: order.orderId, amountPaise: amount * 100, method, approval: { status: approval }, status, utr, refundDate, reserved: approval === "approved", history: [], createdAt, updatedAt: createdAt, __v: 0 });
};

/** Fixed data set used by the dashboard / report tests. */
async function seedData() {
  const o1 = await insertOrder({ status: "confirmed", sub: 3000, del: 80, at: istDate(0, 10) });                    // today, COD unpaid
  const o2 = await insertOrder({ status: "delivered", method: "upi", paid: true, sub: 1500, del: 60, at: istDate(0, 11) }); // today, UPI paid
  const o3 = await insertOrder({ status: "cancelled", sub: 2000, del: 100, at: istDate(0, 9) });                    // today, cancelled
  const o4 = await insertOrder({ status: "shipped", paid: true, sub: 2500, del: 0, at: istDate(-1, 15) });          // yesterday, COD paid
  const o5 = await insertOrder({ status: "delivered", method: "upi", paid: true, sub: 1000, del: 50, at: istDate(-40, 12) }); // 40 days ago
  await insertRefund(o2, { amount: 500, status: "completed", refundDate: istDate(0, 13), utr: "UTR500500" });
  await insertRefund(o4, { amount: 300, status: "completed", refundDate: istDate(-1, 16), utr: "UTR300300", method: "bank_transfer" });
  await insertRefund(o1, { amount: 400, status: "pending", approval: "recommended" });
  await insertRefund(o2, { amount: 200, status: "failed" });
  await insertRefund(o5, { amount: 1050, status: "completed", refundDate: istDate(-40, 12), utr: "UTR105000" });
  const fabricImages = [{ url: "https://res.cloudinary.com/demo/image/upload/v1/sara-royal/p7.jpg", publicId: "sara-royal/p7" }];
  await Suit.create([
    { sku: "SR-0001", name: "A", originalPricePaise: 100, salePricePaise: 100, stock: 10, status: "published", fabricImages },
    { sku: "SR-0002", name: "B", originalPricePaise: 100, salePricePaise: 100, stock: 2, status: "published", fabricImages },
    { sku: "SR-0003", name: "C", originalPricePaise: 100, salePricePaise: 100, stock: 0, status: "published", fabricImages },
    { sku: "SR-0004", name: "D", originalPricePaise: 100, salePricePaise: 100, stock: 3, status: "draft" },
    { sku: "SR-0005", name: "E", originalPricePaise: 100, salePricePaise: 100, stock: 0, status: "archived" },
  ]);
  return { o1, o2, o3, o4, o5 };
}
const dash = async (tok, qs = "") => json(await R.dash.GET(await makeReq(`/api/admin/reports/dashboard${qs}`, { token: tok, ip: ip() })));
const csvText = async (res) => { const b = Buffer.from(await res.arrayBuffer()); assert.deepEqual([...b.subarray(0, 3)], [0xef, 0xbb, 0xbf], "UTF-8 BOM so Excel opens it correctly"); return "\uFEFF" + b.subarray(3).toString("utf8"); };
const exp = async (tok, qs) => R.exp.GET(await makeReq(`/api/admin/reports/export?${qs}`, { token: tok, ip: ip() }));

// ============================================================ dashboard
test("dashboard: inventory cards (non-archived low/out stock; archived excluded)", async () => {
  const o = await user("owner"); await seedData();
  const inv = (await dash(o.token)).body.data.inventory;
  assert.deepEqual(inv, { total: 5, published: 3, draft: 1, archived: 1, lowStock: 2, outOfStock: 1 });
});

test("dashboard 'today': exact order counts and sales definitions (cancelled excluded, delivery separate, unpaid COD not collected)", async () => {
  const o = await user("owner"); await seedData();
  const d = (await dash(o.token, "?range=today")).body.data;
  assert.deepEqual(d.orders, { confirmed: 1, packed: 0, shipped: 0, delivered: 1, cancelled: 1, total: 3, attentionNow: 1 });
  assert.deepEqual(d.sales, {
    orderCount: 2, productSalesPaise: 450000, deliveryChargesPaise: 14000, confirmedTotalPaise: 464000,
    cancelledOrderCount: 1, cancelledTotalPaise: 210000, completedRefundsCount: 1, completedRefundsPaise: 50000, netSalesPaise: 414000,
    paidTotalPaise: 156000, awaitingPaymentTotalPaise: 308000,
  });
  assert.equal(d.range.from, ymd(istDate(0))); assert.equal(d.range.to, ymd(istDate(0)));
  assert.ok(d.definitions.length >= 5);
});

test("dashboard 7d / 30d / custom: ranges include the right days only; older orders and refunds excluded", async () => {
  const o = await user("owner"); await seedData();
  const w = (await dash(o.token, "?range=7d")).body.data;
  assert.deepEqual([w.orders.total, w.sales.productSalesPaise, w.sales.deliveryChargesPaise, w.sales.confirmedTotalPaise, w.sales.completedRefundsPaise, w.sales.netSalesPaise, w.sales.paidTotalPaise, w.sales.awaitingPaymentTotalPaise], [4, 700000, 14000, 714000, 80000, 634000, 406000, 308000]);
  const m = (await dash(o.token, "?range=30d")).body.data; // 40-day-old order and refund stay out
  assert.deepEqual([m.orders.total, m.sales.completedRefundsPaise, m.sales.netSalesPaise], [4, 80000, 634000]);
  const y = ymd(istDate(-1));
  const c = (await dash(o.token, `?range=custom&from=${y}&to=${y}`)).body.data;
  assert.deepEqual([c.orders.total, c.orders.shipped, c.sales.productSalesPaise, c.sales.completedRefundsPaise, c.sales.netSalesPaise], [1, 1, 250000, 30000, 220000]);
  const old = (await dash(o.token, `?range=custom&from=${ymd(istDate(-45))}&to=${ymd(istDate(-35))}`)).body.data;
  assert.deepEqual([old.orders.total, old.sales.confirmedTotalPaise, old.sales.completedRefundsPaise, old.sales.netSalesPaise], [1, 105000, 105000, 0]);
  assert.equal((await dash(o.token)).body.data.orders.total, 4); // default = 30 days
});

test("dashboard: IST day boundary — an order at 00:01 IST belongs to the new IST day, not the previous UTC day", async () => {
  const o = await user("owner");
  await insertOrder({ status: "confirmed", sub: 100, at: new Date("2026-03-09T18:31:00Z") }); // 00:01 IST on 10 Mar
  await insertOrder({ status: "confirmed", sub: 200, at: new Date("2026-03-09T18:29:00Z") }); // 23:59 IST on 9 Mar
  const on = async (day) => (await dash(o.token, `?range=custom&from=${day}&to=${day}`)).body.data.sales.productSalesPaise;
  assert.equal(await on("2026-03-10"), 10000);
  assert.equal(await on("2026-03-09"), 20000);
});

test("dashboard: invalid ranges rejected; reports permission required", async () => {
  const o = await user("owner");
  for (const bad of ["?range=yesterday", "?range=custom", "?range=custom&from=2026-05-10&to=2026-05-01", "?range=custom&from=2026-02-30&to=2026-03-01", "?range=custom&from=2024-01-01&to=2026-01-01"]) assert.equal((await dash(o.token, bad)).status, 400, bad);
  assert.equal((await dash(undefined)).status, 401);
  assert.equal((await dash((await user("staff", { orders: true })).token)).status, 403);
  assert.equal((await dash((await user("staff", { reports: true })).token)).status, 200);
});

// ============================================================ exports
test("export orders CSV: date-range filtered, columns, masked phone for staff, full for owner, no addresses", async () => {
  const owner = await user("owner"), staff = await user("staff", { reports: true });
  await seedData();
  const today = ymd(istDate(0));
  const csvOf = async (tok, qs) => { const r = await exp(tok, qs); assert.equal(r.status, 200); return { r, text: await csvText(r.clone()) }; };
  const { r, text } = await csvOf(owner.token, `type=orders&format=csv&from=${today}&to=${today}`);
  assert.match(r.headers.get("content-type"), /text\/csv/);
  assert.match(r.headers.get("content-disposition"), /attachment; filename="sara-suits-orders-.*\.csv"/);
  assert.equal(r.headers.get("cache-control"), "private, no-store");
  assert.ok(text.startsWith("﻿Order ID,Date (IST),Customer,Phone,Products,SKUs,Quantities,Order status,Payment method,Payment status,Product subtotal,Delivery charge,Order total\r\n"));
  const lines = text.trim().split("\r\n");
  assert.equal(lines.length, 1 + 3); // 3 orders today (incl. the cancelled one: the orders report lists all)
  assert.ok(lines.some((l) => l.includes("SRO-2026-0001") && l.includes("confirmed") && l.includes("Cash on Delivery") && l.includes("pending") && l.includes(",3000,80,3080")));
  assert.ok(lines.some((l) => l.includes("cancelled") && l.includes(",2000,100,2100")));
  assert.ok(text.includes("+919876543210"), "owner sees the full phone number");
  assert.ok(!text.includes("Secret Lane") && !text.includes("140301"), "delivery addresses are never exported");
  const staffCsv = (await csvOf(staff.token, `type=orders&format=csv&from=${today}&to=${today}`)).text;
  assert.ok(staffCsv.includes("XXXXXXXX3210") && !staffCsv.includes("9876543210"), "staff get masked phone numbers");
  const none = (await csvOf(owner.token, "type=orders&format=csv&from=2020-01-01&to=2020-01-31")).text;
  assert.equal(none.trim().split("\r\n").length, 1); // header only
  assert.equal((await Audit.countDocuments({ action: "report.exported" })), 3);
});

test("export CSV: spreadsheet formula injection is neutralised", async () => {
  const owner = await user("owner");
  await insertOrder({ status: "confirmed", sub: 100, at: istDate(0), name: '=HYPERLINK("http://evil.test","click")' });
  await insertOrder({ status: "confirmed", sub: 100, at: istDate(0), name: "+cmd|' /C calc'!A0" });
  const text = await csvText(await exp(owner.token, "type=orders&format=csv&range=today"));
  assert.ok(text.includes(`'=HYPERLINK`) && text.includes(`'+cmd`));
  assert.ok(!/(^|,)=HYPERLINK/m.test(text) && !/(^|,)\+cmd/m.test(text));
});

test("export Excel (.xlsx): real workbook, numeric money cells, About sheet, injection-safe text", async () => {
  const owner = await user("owner");
  await seedData();
  await insertOrder({ status: "confirmed", sub: 100, at: istDate(0), name: "=2+2" });
  const r = await exp(owner.token, "type=orders&format=xlsx&range=today");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("content-type"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.match(r.headers.get("content-disposition"), /\.xlsx"/);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(await r.arrayBuffer()));
  assert.deepEqual(wb.worksheets.map((w) => w.name), ["Orders", "About"]);
  const ws = wb.getWorksheet("Orders");
  assert.equal(ws.rowCount, 1 + 4);
  const header = ws.getRow(1).values.slice(1);
  assert.equal(header[12], "Order total");
  const row = ws.getRows(2, 4).find((rw) => rw.getCell(1).value === "SRO-2026-0001");
  assert.equal(typeof row.getCell(11).value, "number");
  assert.equal(row.getCell(13).value, 3080);
  assert.equal(ws.getColumn(13).numFmt, "#,##0.00");
  assert.ok(ws.getRows(2, 4).some((rw) => rw.getCell(3).value === "'=2+2"));
  const about = wb.getWorksheet("About");
  assert.equal(about.getCell("A1").value, "Report");
  assert.ok(about.getCell("B5").value && String(about.getCell("B5").value).length > 10); // definitions listed
});

test("export sales: one row per IST day + TOTAL; matches the dashboard; cancelled never counted as sales", async () => {
  const owner = await user("owner"); await seedData();
  const text = await await csvText(await exp(owner.token, `type=sales&format=csv&from=${ymd(istDate(-30))}&to=${ymd(istDate(0))}`));
  const lines = text.trim().split("\r\n");
  assert.equal(lines[0], "Date (IST),Confirmed orders,Product subtotal,Delivery charges,Confirmed sales (incl. delivery),Cancelled orders,Cancelled order total,Completed refunds,Net sales");
  const yesterday = lines.find((l) => l.startsWith(ymd(istDate(-1))));
  assert.equal(yesterday, `${ymd(istDate(-1))},1,2500,0,2500,0,0,300,2200`);
  const todayRow = lines.find((l) => l.startsWith(ymd(istDate(0))));
  assert.equal(todayRow, `${ymd(istDate(0))},2,4500,140,4640,1,2100,500,4140`);
  assert.equal(lines[lines.length - 1], "TOTAL,3,7000,140,7140,1,2100,800,6340");
  const d = (await dash(owner.token, "?range=30d")).body.data.sales;
  assert.equal(d.netSalesPaise, 634000); // same number as the TOTAL row
});

test("export refunds: completed by refund date, other statuses by creation date, UTR included", async () => {
  const owner = await user("owner"); await seedData();
  const text = await await csvText(await exp(owner.token, `type=refunds&format=csv&from=${ymd(istDate(-30))}&to=${ymd(istDate(0))}`));
  assert.ok(text.startsWith("﻿Refund ID,Order ID,Return ID,Refund amount,Method,Refund date (IST),Status,Approval,Reference / UTR\r\n"));
  const lines = text.trim().split("\r\n").slice(1);
  assert.equal(lines.length, 4); // two completed in range, the pending and the failed one; the 40-day-old completed one is out
  assert.ok(lines.some((l) => l.includes(",500,UPI,") && l.includes("completed") && l.includes("UTR500500")));
  assert.ok(lines.some((l) => l.includes(",300,Bank transfer,") && l.includes("UTR300300")));
  assert.ok(lines.some((l) => l.includes(",400,") && l.includes("pending") && l.includes("recommended")));
  assert.ok(lines.some((l) => l.includes(",200,") && l.includes("failed")));
  assert.ok(!text.includes("UTR105000"));
});

test("export payments: rows for non-cancelled orders; Excel has a summary by method and status", async () => {
  const owner = await user("owner"); await seedData();
  const text = await await csvText(await exp(owner.token, `type=payments&format=csv&from=${ymd(istDate(-30))}&to=${ymd(istDate(0))}`));
  const lines = text.trim().split("\r\n").slice(1);
  assert.equal(lines.length, 3); // the cancelled order is not a payment
  assert.ok(lines.some((l) => l.startsWith("Cash on Delivery,pending,") && l.endsWith(",3080")));
  assert.ok(lines.some((l) => l.startsWith("Prepaid UPI,paid,") && l.endsWith(",1560")));
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(await (await exp(owner.token, `type=payments&format=xlsx&from=${ymd(istDate(-30))}&to=${ymd(istDate(0))}`)).arrayBuffer()));
  assert.deepEqual(wb.worksheets.map((w) => w.name), ["Payment methods", "Summary", "About"]);
  const sum = wb.getWorksheet("Summary");
  const rows = sum.getRows(2, 3).map((r) => [r.getCell(1).value, r.getCell(2).value, r.getCell(3).value, r.getCell(4).value]);
  assert.deepEqual(rows, [["Cash on Delivery", "paid", 1, 2500], ["Cash on Delivery", "pending", 1, 3080], ["Prepaid UPI", "paid", 1, 1560]]);
});

test("export: permissions and input validation", async () => {
  const owner = await user("owner"); await seedData();
  const ok = "type=orders&format=csv&range=today";
  assert.equal((await exp(undefined, ok)).status, 401);
  assert.equal((await exp((await user("staff", { orders: true, returns: true, products: true, stock: true })).token, ok)).status, 403);
  assert.equal((await exp((await user("staff", { reports: true })).token, ok)).status, 200);
  for (const bad of ["type=x&format=csv&range=today", "type=orders&format=pdf&range=today", "type=orders&format=csv&range=forever", "type=orders&format=csv&from=2026-05-10&to=2026-05-01", "type=orders&format=csv&from=nope&to=nope", "type=orders&format=csv&from=2024-01-01&to=2026-01-01", "format=csv&range=today"]) {
    assert.equal((await exp(owner.token, bad)).status, 400, bad);
  }
});

test("export: rate limited to 20 per minute per user", async () => {
  const owner = await user("owner");
  let last;
  for (let i = 0; i < 21; i++) last = await exp(owner.token, "type=sales&format=csv&range=today");
  assert.equal(last.status, 429);
});

// ============================================================ staff management
const staffCall = async (method, tok, body, id) => id
  ? json(await R.staffOne[method](await makeReq(`/api/admin/staff/${id}`, { method, token: tok, body, ip: ip() }), ctx(id)))
  : json(await R.staff[method](await makeReq("/api/admin/staff", { method, token: tok, body, ip: ip() })));
const loginAs = async (email, password) => json(await R.login.POST(await makeReq("/api/auth/login", { method: "POST", body: { email, password }, ip: ip() })));
const settingsTok = (res) => res.res.headers.get("set-cookie").match(/admin_session=([^;]+)/)[1];

test("staff: only the Owner can list/create/edit; staff with every permission get 403", async () => {
  const owner = await user("owner"), staff = await user("staff", ALL);
  for (const call of [() => staffCall("GET", staff.token), () => staffCall("POST", staff.token, { name: "X Y", email: "x@t.local", password: PW + "1" }), () => staffCall("PUT", staff.token, { active: false }, staff.id)]) assert.equal((await call()).status, 403);
  assert.equal((await staffCall("GET", undefined)).status, 401);
  assert.equal((await staffCall("GET", owner.token)).status, 200);
  assert.equal((await Admin.countDocuments()), 2);
});

test("staff: create validates input; permissions strictly typed; unique email", async () => {
  const owner = await user("owner");
  const good = { name: "Priya Staff", email: "Priya@Shop.test", password: "A-Long-Password-123", permissions: { orders: true, returns: true } };
  const r = await staffCall("POST", owner.token, good);
  assert.equal(r.status, 201);
  assert.deepEqual([r.body.data.email, r.body.data.role, r.body.data.active, r.body.data.permissions], ["priya@shop.test", "staff", true, { products: false, orders: true, stock: false, returns: true, reports: false }]);
  assert.ok(!JSON.stringify(r.body).includes("A-Long-Password-123") && !JSON.stringify(r.body).includes("$2"), "no password or hash in the response");
  assert.equal((await staffCall("POST", owner.token, good)).status, 409);
  assert.equal((await staffCall("POST", owner.token, { ...good, email: "PRIYA@shop.test" })).status, 409);
  for (const bad of [{ name: "" }, { email: "nope" }, { password: "short" }, { permissions: { admin: true } }, { permissions: { orders: "yes" } }, { permissions: [] }, { permissions: null }]) {
    assert.equal((await staffCall("POST", owner.token, { ...good, email: `n${Math.random().toString(36).slice(2, 6)}@t.local`, ...bad })).status, 400, JSON.stringify(bad));
  }
  const stored = await Admin.findOne({ email: "priya@shop.test" }).select("+password").lean();
  assert.equal(stored.role, "staff");
  assert.ok(await bcrypt.compare("A-Long-Password-123", stored.password));
  const audit = await Audit.findOne({ action: "staff.created" }).lean();
  assert.ok(audit && !JSON.stringify(audit).includes("A-Long-Password-123"), "passwords never reach the audit log");
});

test("staff: a new account logs in; permission changes take effect on the very next request", async () => {
  const owner = await user("owner");
  const created = (await staffCall("POST", owner.token, { name: "Priya Staff", email: "priya@shop.test", password: "A-Long-Password-123", permissions: { orders: true } })).body.data;
  const login = await loginAs("priya@shop.test", "A-Long-Password-123");
  assert.equal(login.status, 200);
  const tok = login.body.data.token;
  const listOrders = async () => (await json(await R.orders.GET(await makeReq("/api/admin/orders", { token: tok, ip: ip() })))).status;
  assert.equal(await listOrders(), 200);
  assert.equal((await staffCall("PUT", owner.token, { permissions: { orders: false } }, created.id)).status, 200);
  assert.equal(await listOrders(), 403);
  assert.equal((await staffCall("PUT", owner.token, { permissions: { orders: true, reports: true }, name: "Priya S" }, created.id)).body.data.name, "Priya S");
  assert.equal(await listOrders(), 200);
  assert.equal((await staffCall("PUT", owner.token, { permissions: { superuser: true } }, created.id)).status, 400);
  assert.equal((await staffCall("PUT", owner.token, {}, created.id)).status, 400);
  assert.equal((await staffCall("PUT", owner.token, { name: "x" }, "507f1f77bcf86cd799439011")).status, 404);
  assert.equal(await Audit.countDocuments({ action: "staff.updated" }), 2);
});

test("staff: disabling signs the account out immediately; re-enabling does not resurrect old sessions", async () => {
  const owner = await user("owner");
  const created = (await staffCall("POST", owner.token, { name: "Priya Staff", email: "priya@shop.test", password: "A-Long-Password-123", permissions: { orders: true } })).body.data;
  const tok = (await loginAs("priya@shop.test", "A-Long-Password-123")).body.data.token;
  const me = async (t) => (await json(await R.me.GET(await makeReq("/api/auth/me", { token: t })))).status;
  assert.equal(await me(tok), 200);
  assert.equal((await staffCall("PUT", owner.token, { active: false }, created.id)).status, 200);
  assert.equal(await me(tok), 401);
  assert.equal((await loginAs("priya@shop.test", "A-Long-Password-123")).status, 401);
  assert.equal((await staffCall("PUT", owner.token, { active: "no" }, created.id)).status, 400);
  await staffCall("PUT", owner.token, { active: true }, created.id);
  assert.equal(await me(tok), 401, "the old session stays revoked");
  assert.equal((await loginAs("priya@shop.test", "A-Long-Password-123")).status, 200);
  assert.equal(await Audit.countDocuments({ action: "staff.disabled" }), 1);
});

test("staff: Owner password reset revokes old sessions and the old password; new password works", async () => {
  const owner = await user("owner");
  const created = (await staffCall("POST", owner.token, { name: "Priya Staff", email: "priya@shop.test", password: "A-Long-Password-123", permissions: {} })).body.data;
  const old = (await loginAs("priya@shop.test", "A-Long-Password-123")).body.data.token;
  assert.equal((await staffCall("PUT", owner.token, { newPassword: "short" }, created.id)).status, 400);
  assert.equal((await staffCall("PUT", owner.token, { newPassword: "A-Brand-New-Password-9" }, created.id)).status, 200);
  assert.equal((await json(await R.me.GET(await makeReq("/api/auth/me", { token: old })))).status, 401);
  assert.equal((await loginAs("priya@shop.test", "A-Long-Password-123")).status, 401);
  assert.equal((await loginAs("priya@shop.test", "A-Brand-New-Password-9")).status, 200);
  const audit = await Audit.findOne({ action: "staff.password_reset" }).lean();
  assert.ok(audit && !JSON.stringify(audit).includes("A-Brand-New-Password-9"));
});

test("staff: Owner accounts (including the legacy 'admin' role) cannot be edited through this API", async () => {
  const owner = await user("owner"), legacy = await user("admin");
  assert.equal((await staffCall("PUT", owner.token, { active: false }, legacy.id)).status, 403);
  assert.equal((await staffCall("PUT", owner.token, { newPassword: "A-Brand-New-Password-9" }, owner.id)).status, 403);
  assert.equal((await Admin.findById(legacy.id).lean()).active, true);
  const list = (await staffCall("GET", owner.token)).body.data;
  assert.ok(list.every((a) => !("password" in a)));
  assert.deepEqual(list.map((a) => a.role).sort(), ["owner", "owner"]);
});

test("change-password: signs out other sessions, keeps the current one signed in with a fresh cookie", async () => {
  const owner = await user("owner");
  const other = owner.token; // a second session
  const res = await json(await R.pw.POST(await makeReq("/api/auth/change-password", { method: "POST", token: owner.token, body: { currentPassword: PW, newPassword: "A-Much-Longer-New-Pass-1" }, ip: ip() })));
  assert.equal(res.status, 200);
  assert.match(res.res.headers.get("set-cookie"), /admin_session=/);
  const fresh = settingsTok(res);
  assert.equal((await json(await R.me.GET(await makeReq("/api/auth/me", { token: fresh })))).status, 200);
  assert.equal((await json(await R.me.GET(await makeReq("/api/auth/me", { token: other })))).status, 401, "the previous session is signed out");
});

// ============================================================ audit log
test("audit log: Owner-only, filterable, paginated, no secrets", async () => {
  const owner = await user("owner"), staff = await user("staff", ALL);
  const sId = new env.mongoose.Types.ObjectId();
  await Audit.create([
    { actorId: owner.id, actorEmail: "owner@x.test", actorRole: "owner", action: "refund.approve", entityType: "refund", entityId: "1", summary: "SRF-1" },
    { actorId: staff.id, actorEmail: "staff@x.test", actorRole: "staff", action: "order.created", entityType: "order", entityId: String(sId), summary: "SRO-1" },
    { actorId: staff.id, actorEmail: "staff@x.test", actorRole: "staff", action: "order.cancelled", entityType: "order", entityId: "2", summary: "SRO-2" },
  ]);
  const get = async (tok, qs = "") => json(await R.audit.GET(await makeReq(`/api/admin/audit${qs}`, { token: tok, ip: ip() })));
  assert.equal((await get(undefined)).status, 401);
  assert.equal((await get(staff.token)).status, 403);
  const all = await get(owner.token);
  assert.equal(all.status, 200);
  assert.deepEqual([all.body.data.total, all.body.data.items[0].action], [3, "order.cancelled"]); // newest first
  assert.deepEqual((await get(owner.token, "?action=order.")).body.data.items.map((i) => i.action), ["order.cancelled", "order.created"]);
  assert.equal((await get(owner.token, "?actor=staff@")).body.data.total, 2);
  assert.equal((await get(owner.token, "?entityType=refund")).body.data.total, 1);
  assert.equal((await get(owner.token, "?action=.*")).body.data.total, 0); // escaped, not a pattern
  assert.equal((await get(owner.token, "?limit=5")).status, 400);
  assert.equal((await get(owner.token, "?from=bad")).status, 400);
  assert.equal((await get(owner.token, "?limit=20&page=2")).body.data.items.length, 0);
  assert.ok(!JSON.stringify(all.body).match(/password|secret|token/i));
});
