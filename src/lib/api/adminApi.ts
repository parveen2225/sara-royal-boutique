"use client";

import { apiJson } from "@/lib/api/client";

const j = (b: unknown) => JSON.stringify(b);
const qs = (q: object) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "") p.set(k, String(v)); return p.toString(); };

export type Dashboard = {
  range: { from: string; to: string; label: string };
  inventory: { total: number; published: number; draft: number; archived: number; lowStock: number; outOfStock: number };
  orders: { confirmed: number; packed: number; shipped: number; delivered: number; cancelled: number; total: number; attentionNow: number };
  sales: { orderCount: number; productSalesPaise: number; deliveryChargesPaise: number; confirmedTotalPaise: number; cancelledOrderCount: number; cancelledTotalPaise: number; completedRefundsCount: number; completedRefundsPaise: number; netSalesPaise: number; paidTotalPaise: number; awaitingPaymentTotalPaise: number };
  definitions: string[];
};
export type RangeQuery = { range: "today" | "7d" | "30d" | "custom"; from?: string; to?: string };
export const dashboardApi = { get: async (q: RangeQuery) => (await apiJson<Dashboard>(`/api/admin/reports/dashboard?${qs(q)}`)).data };
export const exportUrl = (type: string, format: string, q: RangeQuery) => `/api/admin/reports/export?${qs({ type, format, ...q })}`;

export type StaffRow = { id: string; name: string; email: string; role: "owner" | "staff"; active: boolean; permissions: Record<"products" | "orders" | "stock" | "returns" | "reports", boolean>; lastLoginAt: string | null; createdAt: string };
export const staffApi = {
  list: async () => (await apiJson<StaffRow[]>("/api/admin/staff")).data,
  create: async (body: Record<string, unknown>) => (await apiJson<StaffRow>("/api/admin/staff", { method: "POST", body: j(body) })).data,
  update: async (id: string, body: Record<string, unknown>) => (await apiJson<StaffRow>(`/api/admin/staff/${id}`, { method: "PUT", body: j(body) })).data,
};

export type AuditRow = { id: string; at: string; actorEmail: string; actorRole: string; action: string; entityType: string; entityId: string; summary: string };
export type AuditPage = { items: AuditRow[]; total: number; page: number; limit: number; pages: number };
export const auditApi = { list: async (q: object) => (await apiJson<AuditPage>(`/api/admin/audit?${qs(q)}`)).data };
