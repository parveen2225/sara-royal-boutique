"use client";

import { apiJson } from "@/lib/api/client";

const j = (b: unknown) => JSON.stringify(b);
const qs = (q: object) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "") p.set(k, String(v)); return p.toString(); };

export type ReturnRow = {
  id: string; returnId: string; orderRef: string; orderId: string; type: "return" | "exchange";
  reasonType: "preference" | "wrong_item" | "defective"; reasonNote: string; unusedUncutConfirmed: boolean;
  items: { suitId: string; variantId?: string | null; sku: string; name: string; quantity: number; unitPricePaise: number }[];
  photos: string[]; requestedAt: string; deliveredAt: string; withinWindow: boolean; exceptionNote: string;
  returnShipping: { courier?: string; trackingNumber?: string; trackingUrl?: string; paidBy: "boutique" | "customer" };
  decision: { status: "pending" | "approved" | "rejected"; byEmail?: string; at?: string; note?: string };
  receipt: { status: "not_received" | "received"; at?: string };
  inspection: { result: "pending" | "resellable" | "not_resellable"; note?: string };
  resolution: "none" | "refund" | "exchange" | "closed" | "rejected";
  exchange: { replacementSuitId: string; replacementVariantId?: string | null; sku: string; name: string; quantity: number; fulfilled: boolean } | null;
  restocked: boolean; history: { at: string; action: string; byEmail: string; note: string }[]; createdAt: string;
};
export type ReturnDetail = ReturnRow & { stockMovements: { sku: string; change: number; resultingQty: number; reason: string }[]; refunds: RefundRow[] };
export type RefundRow = {
  id: string; refundId: string; orderRef: string; orderId: string; returnId: string; amountPaise: number; method: "upi" | "bank_transfer";
  approval: { status: "recommended" | "approved" | "rejected"; byEmail?: string; at?: string; note?: string };
  status: "pending" | "processing" | "completed" | "failed"; utr: string; refundDate?: string; notes: string; reserved: boolean;
  history: { at: string; action: string; byEmail: string; note: string }[]; recommendedByEmail: string; createdAt: string;
};
export type Paged<T> = { items: T[]; total: number; page: number; limit: number; pages: number };

export const returnsApi = {
  list: async (q: object) => (await apiJson<Paged<ReturnRow>>(`/api/admin/returns?${qs(q)}`)).data,
  get: async (id: string) => (await apiJson<ReturnDetail>(`/api/admin/returns/${id}`)).data,
  create: async (body: Record<string, unknown>) => (await apiJson<ReturnRow>("/api/admin/returns", { method: "POST", body: j(body) })).data,
  act: async (id: string, body: Record<string, unknown>) => (await apiJson<ReturnRow>(`/api/admin/returns/${id}/action`, { method: "POST", body: j(body) })).data,
};
export const refundsApi = {
  list: async (q: object) => (await apiJson<Paged<RefundRow>>(`/api/admin/refunds?${qs(q)}`)).data,
  get: async (id: string) => (await apiJson<RefundRow>(`/api/admin/refunds/${id}`)).data,
  recommend: async (body: Record<string, unknown>) => (await apiJson<RefundRow>("/api/admin/refunds", { method: "POST", body: j(body) })).data,
  act: async (id: string, body: Record<string, unknown>) => (await apiJson<RefundRow>(`/api/admin/refunds/${id}/action`, { method: "POST", body: j(body) })).data,
};
export const settingsApi = {
  get: async () => (await apiJson<AdminSettings>("/api/admin/settings")).data,
  save: async (body: Record<string, unknown>) => (await apiJson<AdminSettings>("/api/admin/settings", { method: "PUT", body: j(body) })).data,
};
export type AdminSettings = {
  whatsappNumber: string; boutiqueName: string; businessAddress: string; contactNumber: string; email: string; invoiceFooter: string;
  logo: { url: string; publicId: string } | null; gst: { enabled: boolean; gstin: string; legalName: string };
};
