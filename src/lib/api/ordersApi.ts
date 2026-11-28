"use client";

import { apiJson } from "@/lib/api/client";

export type OrderStatus = "confirmed" | "packed" | "shipped" | "delivered" | "cancelled";
export type OrderLine = { suitId: string; variantId?: string | null; sku: string; name: string; unitPricePaise: number; quantity: number; lineTotalPaise: number; returnedQuantity?: number };
export type Order = {
  id: string; orderId: string;
  customer: { name: string; phone: string; address: string; pincode: string };
  items: OrderLine[];
  subtotalPaise: number; deliveryChargePaise: number; totalPaise: number;
  paymentMethod: "cod" | "upi"; paymentStatus: "pending" | "paid"; paidAt?: string;
  status: OrderStatus;
  courier: { name?: string; trackingNumber?: string; trackingUrl?: string; shippedAt?: string };
  deliveredAt?: string; cancelledAt?: string; cancelReason: string; notes: string;
  stockDeducted: boolean; refundCommittedPaise: number; invoiceId: string;
  statusHistory: { status: string; at: string; byEmail: string; note: string }[];
  createdByEmail: string; createdAt: string; updatedAt: string;
};
export type OrderDetail = Order & { stockMovements: { sku: string; previousQty: number; change: number; resultingQty: number; reason: string; at: string }[] };
export type OrderList = { items: Order[]; total: number; page: number; limit: number; pages: number };
/** One pickable row: a suit, or one image variant of a suit (then `sku` is the variant code and `stock` its stock). */
export type OrderSuit = { id: string; variantId?: string; sku: string; name: string; salePricePaise: number; stock: number; status: string; cover: string };
export const orderSuitKey = (s: { id?: string; suitId?: string; variantId?: string | null }) => `${s.id ?? s.suitId}:${s.variantId ?? ""}`;
export type OrderQuery = { q?: string; status?: string; payment?: string; method?: string; from?: string; to?: string; sort?: string; page?: number; limit?: number };

const j = (b: unknown) => JSON.stringify(b);
const qs = (q: object) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "") p.set(k, String(v));
  return p.toString();
};

export const ordersApi = {
  list: async (q: OrderQuery) => (await apiJson<OrderList>(`/api/admin/orders?${qs(q)}`)).data,
  get: async (id: string) => (await apiJson<OrderDetail>(`/api/admin/orders/${id}`)).data,
  create: async (body: Record<string, unknown>) => (await apiJson<Order & { duplicate: boolean }>("/api/admin/orders", { method: "POST", body: j(body) })).data,
  update: async (id: string, body: Record<string, unknown>) => (await apiJson<Order>(`/api/admin/orders/${id}`, { method: "PUT", body: j(body) })).data,
  setStatus: async (id: string, body: Record<string, unknown>) => (await apiJson<Order>(`/api/admin/orders/${id}/status`, { method: "POST", body: j(body) })).data,
  cancel: async (id: string, reason: string) => (await apiJson<Order>(`/api/admin/orders/${id}/cancel`, { method: "POST", body: j({ reason }) })).data,
  setPayment: async (id: string, paymentStatus: "paid" | "pending") => (await apiJson<Order>(`/api/admin/orders/${id}/payment`, { method: "POST", body: j({ paymentStatus }) })).data,
  searchSuits: async (q: string) => (await apiJson<OrderSuit[]>(`/api/admin/order-suits?${qs({ q })}`, { skipLoader: true })).data,
  settings: async () => (await apiJson<{ whatsappNumber: string | null; boutiqueName: string }>("/api/settings/public", { skipLoader: true })).data,
};
