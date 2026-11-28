import { rupeesToPaise } from "./money";
import { cleanText, isIdempotencyKey, isObjectId, isPincode, isSafeTrackingUrl, normalizeCustomerPhone } from "./validation";

export type OrderItemInput = { suitId: string; variantId?: string; quantity: number };
export type ParsedOrder = {
  customer: { name: string; phone: string; address: string; pincode: string };
  items: OrderItemInput[];
  deliveryChargePaise: number;
  paymentMethod: "cod" | "upi";
  paymentStatus: "pending" | "paid";
  notes: string;
  idempotencyKey?: string;
};
type Res<T> = { ok: true; data: T } | { ok: false; message: string };

export function parseOrderInput(body: Record<string, unknown>): Res<ParsedOrder> {
  const fail = (message: string) => ({ ok: false as const, message });
  const c = (body.customer ?? {}) as Record<string, unknown>;
  const name = cleanText(c.name, 120);
  if (name.length < 2) return fail("Customer name is required.");
  const phone = normalizeCustomerPhone(c.phone);
  if (!phone) return fail("Enter a valid customer phone number (10-digit Indian mobile or with country code).");
  const address = cleanText(c.address, 500);
  if (address.length < 5) return fail("Full delivery address is required.");
  const pincode = typeof c.pincode === "string" ? c.pincode.trim() : "";
  if (!isPincode(pincode)) return fail("Enter a valid 6-digit PIN code.");

  const rawItems = body.items;
  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 50) return fail("Add 1 to 50 items to the order.");
  const seen = new Set<string>();
  const items: OrderItemInput[] = [];
  for (const r of rawItems) {
    const row = (r ?? {}) as { suitId?: unknown; variantId?: unknown; quantity?: unknown };
    if (!isObjectId(row.suitId)) return fail("An order item has an invalid suit.");
    const variantId = row.variantId === undefined || row.variantId === null || row.variantId === "" ? undefined : row.variantId;
    if (variantId !== undefined && !isObjectId(variantId)) return fail("An order item has an invalid variant.");
    const key = `${row.suitId}:${variantId ?? ""}`;
    if (seen.has(key)) return fail("The same suit appears twice. Combine the quantities.");
    if (typeof row.quantity !== "number" || !Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > 999) return fail("Quantities must be whole numbers from 1 to 999.");
    seen.add(key);
    items.push({ suitId: row.suitId, ...(variantId ? { variantId } : {}), quantity: row.quantity });
  }

  let deliveryChargePaise = 0;
  if (body.deliveryCharge !== undefined && body.deliveryCharge !== null && body.deliveryCharge !== "") {
    const d = rupeesToPaise(body.deliveryCharge);
    if (d === null) return fail("Delivery charge must be a valid amount (max 2 decimals).");
    deliveryChargePaise = d;
  }
  if (body.paymentMethod !== "cod" && body.paymentMethod !== "upi") return fail("Payment method must be COD or UPI.");
  const paymentStatus = body.paymentStatus === "paid" ? "paid" : "pending";
  if (body.paymentStatus !== undefined && body.paymentStatus !== "paid" && body.paymentStatus !== "pending") return fail("Payment status must be pending or paid.");
  if (body.idempotencyKey !== undefined && !isIdempotencyKey(body.idempotencyKey)) return fail("Invalid idempotency key.");

  return { ok: true, data: { customer: { name, phone, address, pincode }, items, deliveryChargePaise, paymentMethod: body.paymentMethod, paymentStatus, notes: cleanText(body.notes, 1000), idempotencyKey: body.idempotencyKey as string | undefined } };
}

export const ORDER_RANK: Record<string, number> = { confirmed: 0, packed: 1, shipped: 2, delivered: 3 };

/** Allowed forward moves: confirmed→packed|shipped, packed→shipped, shipped→delivered. Never backwards; cancel has its own action. */
export function isAllowedTransition(from: string, to: string): boolean {
  if (from === "confirmed") return to === "packed" || to === "shipped";
  if (from === "packed") return to === "shipped";
  if (from === "shipped") return to === "delivered";
  return false;
}

export type CourierInput = { name?: string; trackingNumber?: string; trackingUrl?: string };
export function parseCourier(body: Record<string, unknown>): Res<CourierInput> {
  const out: CourierInput = {};
  if ("courierName" in body) out.name = cleanText(body.courierName, 80);
  if ("trackingNumber" in body) out.trackingNumber = cleanText(body.trackingNumber, 80);
  if ("trackingUrl" in body) {
    const url = typeof body.trackingUrl === "string" ? body.trackingUrl.trim() : "";
    if (url && !isSafeTrackingUrl(url)) return { ok: false, message: "Tracking link must be a valid https:// URL." };
    out.trackingUrl = url;
  }
  return { ok: true, data: out };
}

/** Accepts "YYYY-MM-DD" or an ISO timestamp; not more than a day in the future. */
export function parseEventDate(value: unknown, now = new Date()): Date | null | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime()) || d.getTime() > now.getTime() + 24 * 3600 * 1000 || d.getUTCFullYear() < 2020) return null;
  return d;
}
