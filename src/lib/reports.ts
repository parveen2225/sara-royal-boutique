import SuitOrder from "@/models/SuitOrder";
import SuitRefund from "@/models/SuitRefund";
import UnstitchedSuit from "@/models/UnstitchedSuit";
import { LOW_STOCK_MAX } from "@/lib/suitInput";
import { formatPaise } from "@/lib/money";
import { maskPhone, type Cell } from "@/lib/csv";
import { ymdIst, type DateRange } from "@/lib/dates";

export const MAX_EXPORT_ROWS = 20000;

/**
 * DEFINITIONS (shown on the dashboard and in the exports):
 *  - Orders are counted by the date they were created (IST).
 *  - Product sales / delivery charges / confirmed total: all orders in range that are NOT cancelled (delivery charges
 *    are reported separately from product sales).
 *  - Cancelled total: the totals of orders in range that were cancelled. They are never part of sales.
 *  - Completed refunds: refunds whose payment was completed with a refund date in range.
 *  - Net sales = confirmed total - completed refunds.
 *  - "Paid" vs "awaiting payment": split of the confirmed total by payment status. Unpaid COD is NOT cash collected.
 */
export { REPORT_DEFINITIONS } from "@/lib/reportDefinitions";
import { REPORT_DEFINITIONS as _DEFS } from "@/lib/reportDefinitions";
void _DEFS;

export async function salesSummary(range: DateRange) {
  const created = { createdAt: { $gte: range.from, $lt: range.to } };
  const [byStatus, byPayment, refunds, attentionNow] = await Promise.all([
    SuitOrder.aggregate([{ $match: created }, { $group: { _id: "$status", count: { $sum: 1 }, subtotal: { $sum: "$subtotalPaise" }, delivery: { $sum: "$deliveryChargePaise" }, total: { $sum: "$totalPaise" } } }]),
    SuitOrder.aggregate([{ $match: { ...created, status: { $ne: "cancelled" } } }, { $group: { _id: "$paymentStatus", count: { $sum: 1 }, total: { $sum: "$totalPaise" } } }]),
    SuitRefund.aggregate([{ $match: { status: "completed", refundDate: { $gte: range.from, $lt: range.to } } }, { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$amountPaise" } } }]),
    SuitOrder.countDocuments({ status: { $in: ["confirmed", "packed"] } }),
  ]);
  const st = (name: string) => byStatus.find((s) => s._id === name) ?? { count: 0, subtotal: 0, delivery: 0, total: 0 };
  const live = ["confirmed", "packed", "shipped", "delivered"].map(st);
  const sum = (k: "subtotal" | "delivery" | "total" | "count") => live.reduce((a, s) => a + s[k], 0);
  const productSalesPaise = sum("subtotal");
  const deliveryChargesPaise = sum("delivery");
  const confirmedTotalPaise = sum("total");
  const completedRefundsPaise = refunds[0]?.total ?? 0;
  const pay = (name: string) => byPayment.find((p) => p._id === name) ?? { count: 0, total: 0 };
  return {
    orders: { confirmed: st("confirmed").count, packed: st("packed").count, shipped: st("shipped").count, delivered: st("delivered").count, cancelled: st("cancelled").count, total: byStatus.reduce((a, s) => a + s.count, 0), attentionNow },
    sales: {
      orderCount: sum("count"),
      productSalesPaise,
      deliveryChargesPaise,
      confirmedTotalPaise,
      cancelledOrderCount: st("cancelled").count,
      cancelledTotalPaise: st("cancelled").total,
      completedRefundsCount: refunds[0]?.count ?? 0,
      completedRefundsPaise,
      netSalesPaise: confirmedTotalPaise - completedRefundsPaise,
      paidTotalPaise: pay("paid").total,
      awaitingPaymentTotalPaise: pay("pending").total,
    },
  };
}

export async function inventorySummary() {
  const [byStatus, low, out] = await Promise.all([
    UnstitchedSuit.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    UnstitchedSuit.countDocuments({ status: { $ne: "archived" }, stock: { $gte: 1, $lte: LOW_STOCK_MAX } }),
    UnstitchedSuit.countDocuments({ status: { $ne: "archived" }, stock: 0 }),
  ]);
  const n = (s: string) => byStatus.find((x) => x._id === s)?.count ?? 0;
  return { total: n("draft") + n("published") + n("archived"), published: n("published"), draft: n("draft"), archived: n("archived"), lowStock: low, outOfStock: out };
}

export type ReportType = "orders" | "sales" | "refunds" | "payments";
export type Column = { header: string; money?: boolean; width?: number };
export type Report = { title: string; columns: Column[]; rows: Cell[][]; summary?: { title: string; columns: Column[]; rows: Cell[][] } };

const rupees = (paise: number) => Number(formatPaise(paise)); // exact to 2 decimals
const money = (h: string, width = 16): Column => ({ header: h, money: true, width });

export async function buildReport(type: ReportType, range: DateRange, opts: { fullPhone: boolean }): Promise<Report> {
  const created = { createdAt: { $gte: range.from, $lt: range.to } };
  const phone = (p: string) => (opts.fullPhone ? `+${p}` : maskPhone(p));
  const method = (m: string) => (m === "upi" ? "Prepaid UPI" : "Cash on Delivery");

  if (type === "orders") {
    const docs = await SuitOrder.find(created).sort({ createdAt: 1, _id: 1 }).limit(MAX_EXPORT_ROWS).lean();
    return {
      title: "Orders",
      columns: [{ header: "Order ID", width: 16 }, { header: "Date (IST)", width: 12 }, { header: "Customer", width: 22 }, { header: "Phone", width: 16 }, { header: "Products", width: 40 }, { header: "SKUs", width: 20 }, { header: "Quantities", width: 12 }, { header: "Order status", width: 14 }, { header: "Payment method", width: 16 }, { header: "Payment status", width: 14 }, money("Product subtotal"), money("Delivery charge"), money("Order total")],
      rows: docs.map((o) => [o.orderId, ymdIst(o.createdAt), o.customer.name, phone(o.customer.phone), o.items.map((i: { name: string }) => i.name).join("; "), o.items.map((i: { sku: string }) => i.sku).join("; "), o.items.map((i: { quantity: number }) => i.quantity).join("; "), o.status, method(o.paymentMethod), o.paymentStatus, rupees(o.subtotalPaise), rupees(o.deliveryChargePaise), rupees(o.totalPaise)]),
    };
  }

  if (type === "payments") {
    const docs = await SuitOrder.find({ ...created, status: { $ne: "cancelled" } }).sort({ createdAt: 1, _id: 1 }).limit(MAX_EXPORT_ROWS).lean();
    const groups = new Map<string, { count: number; total: number }>();
    for (const o of docs) { const k = `${method(o.paymentMethod)}|${o.paymentStatus}`; const g = groups.get(k) ?? { count: 0, total: 0 }; g.count++; g.total += o.totalPaise; groups.set(k, g); }
    return {
      title: "Payment methods",
      columns: [{ header: "Payment method", width: 18 }, { header: "Payment status", width: 15 }, { header: "Order ID", width: 16 }, { header: "Date (IST)", width: 12 }, { header: "Customer", width: 22 }, { header: "Order status", width: 14 }, money("Amount")],
      rows: docs.map((o) => [method(o.paymentMethod), o.paymentStatus, o.orderId, ymdIst(o.createdAt), o.customer.name, o.status, rupees(o.totalPaise)]),
      summary: { title: "Summary", columns: [{ header: "Payment method", width: 18 }, { header: "Payment status", width: 15 }, { header: "Orders", width: 10 }, money("Amount")], rows: [...groups.entries()].sort().map(([k, g]) => { const [m, s] = k.split("|"); return [m, s, g.count, rupees(g.total)]; }) },
    };
  }

  if (type === "refunds") {
    const docs = await SuitRefund.find({ $or: [{ status: "completed", refundDate: { $gte: range.from, $lt: range.to } }, { status: { $ne: "completed" }, createdAt: { $gte: range.from, $lt: range.to } }] }).sort({ createdAt: 1, _id: 1 }).limit(MAX_EXPORT_ROWS).lean();
    return {
      title: "Refunds",
      columns: [{ header: "Refund ID", width: 16 }, { header: "Order ID", width: 16 }, { header: "Return ID", width: 16 }, money("Refund amount"), { header: "Method", width: 14 }, { header: "Refund date (IST)", width: 16 }, { header: "Status", width: 12 }, { header: "Approval", width: 13 }, { header: "Reference / UTR", width: 22 }],
      rows: docs.map((r) => [r.refundId, r.orderId, r.returnId || "", rupees(r.amountPaise), r.method === "upi" ? "UPI" : "Bank transfer", r.refundDate ? ymdIst(r.refundDate) : "", r.status, r.approval.status, r.utr || ""]),
    };
  }

  // sales: one row per IST day + a totals row
  const [orderDays, refundDays] = await Promise.all([
    SuitOrder.aggregate([{ $match: created }, { $group: { _id: { d: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+05:30" } }, cancelled: { $eq: ["$status", "cancelled"] } }, count: { $sum: 1 }, subtotal: { $sum: "$subtotalPaise" }, delivery: { $sum: "$deliveryChargePaise" }, total: { $sum: "$totalPaise" } } }]),
    SuitRefund.aggregate([{ $match: { status: "completed", refundDate: { $gte: range.from, $lt: range.to } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$refundDate", timezone: "+05:30" } }, total: { $sum: "$amountPaise" } } }]),
  ]);
  const days = new Map<string, { orders: number; sub: number; del: number; conf: number; cOrders: number; cTotal: number; ref: number }>();
  const day = (d: string) => { let x = days.get(d); if (!x) { x = { orders: 0, sub: 0, del: 0, conf: 0, cOrders: 0, cTotal: 0, ref: 0 }; days.set(d, x); } return x; };
  for (const g of orderDays) { const x = day(g._id.d); if (g._id.cancelled) { x.cOrders += g.count; x.cTotal += g.total; } else { x.orders += g.count; x.sub += g.subtotal; x.del += g.delivery; x.conf += g.total; } }
  for (const g of refundDays) day(g._id).ref += g.total;
  const rows: Cell[][] = [...days.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([d, x]) => [d, x.orders, rupees(x.sub), rupees(x.del), rupees(x.conf), x.cOrders, rupees(x.cTotal), rupees(x.ref), rupees(x.conf - x.ref)]);
  const tot = [...days.values()].reduce((a, x) => ({ orders: a.orders + x.orders, sub: a.sub + x.sub, del: a.del + x.del, conf: a.conf + x.conf, cOrders: a.cOrders + x.cOrders, cTotal: a.cTotal + x.cTotal, ref: a.ref + x.ref }), { orders: 0, sub: 0, del: 0, conf: 0, cOrders: 0, cTotal: 0, ref: 0 });
  rows.push(["TOTAL", tot.orders, rupees(tot.sub), rupees(tot.del), rupees(tot.conf), tot.cOrders, rupees(tot.cTotal), rupees(tot.ref), rupees(tot.conf - tot.ref)]);
  return {
    title: "Sales",
    columns: [{ header: "Date (IST)", width: 14 }, { header: "Confirmed orders", width: 16 }, money("Product subtotal"), money("Delivery charges"), money("Confirmed sales (incl. delivery)"), { header: "Cancelled orders", width: 16 }, money("Cancelled order total"), money("Completed refunds"), money("Net sales")],
    rows,
  };
}
