"use client";

import { apiJson } from "@/lib/api/client";

export type SuitImage = { url: string; publicId: string };
export type SuitStatus = "draft" | "published" | "archived";
export type StockState = "in_stock" | "low_stock" | "out_of_stock";

export type AdminSuit = {
  id: string;
  sku: string;
  name: string;
  description: string;
  details: string;
  fabric: string;
  color: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  stock: number;
  stockState: StockState;
  categoryIds: string[];
  categories: { id: string; name: string; slug: string; active: boolean }[];
  fabricImages: SuitImage[];
  referenceImages: SuitImage[];
  featured: boolean;
  status: SuitStatus;
  createdAt: string;
  updatedAt: string;
};

export type SuitCategory = { id: string; name: string; slug: string; description: string; active: boolean; displayOrder: number; suitCount: number };
export type StockChangeResult = { id: string; previousQty: number; change: number; stock: number; stockState: StockState };
export type StockMovementRow = { id: string; previousQty: number; change: number; resultingQty: number; reason: string; note: string; actorEmail: string; createdAt: string };
export type SuitListResult = { items: AdminSuit[]; total: number; page: number; limit: number; pages: number };
export type SuitListQuery = { q?: string; status?: string; category?: string; stock?: string; sort?: string; page?: number; limit?: number };

const BASE = "/api/admin/suits";
const json = (body: unknown) => JSON.stringify(body);

export const formatInr = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 }).format(value);

export const suitsApi = {
  list: async (query: SuitListQuery) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") p.set(k, String(v));
    return (await apiJson<SuitListResult>(`${BASE}?${p.toString()}`)).data;
  },
  get: async (id: string) => (await apiJson<AdminSuit>(`${BASE}/${id}`)).data,
  create: async (body: Record<string, unknown>) => (await apiJson<AdminSuit>(BASE, { method: "POST", body: json(body) })).data,
  update: async (id: string, body: Record<string, unknown>) => (await apiJson<AdminSuit>(`${BASE}/${id}`, { method: "PUT", body: json(body) })).data,
  setStatus: async (id: string, status: SuitStatus) => (await apiJson(`${BASE}/${id}/status`, { method: "POST", body: json({ status }) })).data,
  setStock: async (id: string, body: { mode: "set" | "adjust"; quantity: number; reason: string; note?: string }) =>
    (await apiJson<StockChangeResult>(`${BASE}/${id}/stock`, { method: "POST", body: json(body) })).data,
  /** Live stock for one suit (no page loader): the stock dialog reads it on open. */
  stockLevel: async (id: string) => (await apiJson<AdminSuit>(`${BASE}/${id}`, { skipLoader: true })).data,
  stockHistory: async (id: string) => (await apiJson<StockMovementRow[]>(`${BASE}/${id}/stock`, { skipLoader: true })).data,
  remove: async (id: string) => (await apiJson(`${BASE}/${id}?confirm=true`, { method: "DELETE" })).data,

  categories: async () => (await apiJson<SuitCategory[]>("/api/admin/suit-categories")).data,
  createCategory: async (body: { name: string; description?: string; active?: boolean }) => (await apiJson("/api/admin/suit-categories", { method: "POST", body: json(body) })).data,
  updateCategory: async (id: string, body: Record<string, unknown>) => (await apiJson(`/api/admin/suit-categories/${id}`, { method: "PUT", body: json(body) })).data,
  deleteCategory: async (id: string, confirm: boolean) => (await apiJson(`/api/admin/suit-categories/${id}${confirm ? "?confirm=true" : ""}`, { method: "DELETE" })).data,
};

export const errorMessage = (e: unknown, fallback = "Something went wrong.") => (e instanceof Error && e.message ? e.message : fallback);
