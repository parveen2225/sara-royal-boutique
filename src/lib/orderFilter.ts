import { istRangeFromDates } from "@/lib/dates";
import { cleanText } from "@/lib/validation";
import { escapeRegex } from "@/lib/suitInput";

/** Shared by the list endpoint and the reports: builds a Mongo filter from query params (dates are IST days). */
export function buildOrderFilter(p: URLSearchParams): { filter: Record<string, unknown> } | { error: string } {
  const filter: Record<string, unknown> = {};
  const status = p.get("status");
  if (status) {
    if (!["confirmed", "packed", "shipped", "delivered", "cancelled"].includes(status)) return { error: "Invalid status filter" };
    filter.status = status;
  }
  const payment = p.get("payment");
  if (payment) {
    if (payment !== "pending" && payment !== "paid") return { error: "Invalid payment filter" };
    filter.paymentStatus = payment;
  }
  const method = p.get("method");
  if (method) {
    if (method !== "cod" && method !== "upi") return { error: "Invalid payment method filter" };
    filter.paymentMethod = method;
  }
  const q = cleanText(p.get("q"), 80);
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ orderId: rx }, { "customer.name": rx }, { "customer.phone": rx }, { "items.sku": rx }];
  }
  const from = p.get("from"), to = p.get("to");
  if (from || to) {
    const range = istRangeFromDates(from, to ?? from);
    if (!range) return { error: "Invalid date range (use YYYY-MM-DD, up to 366 days)." };
    filter.createdAt = { $gte: range.from, $lt: range.to };
  }
  return { filter };
}
