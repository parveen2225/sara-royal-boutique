"use client";

import { apiJson } from "@/lib/api/client";
import type { ValidatedLine } from "@/lib/cartCore";

export type PublicSuitListItem = {
  id: string; sku: string; name: string; fabric: string; color: string;
  originalPricePaise: number; salePricePaise: number; discountPercent: number;
  inStock: boolean; maxQuantity: number; cover: string;
  images?: string[]; imageCount?: number; // up to 4 card photos (first = cover) and how many the suit has in total
  categories: { id: string; name: string; slug: string }[]; featured: boolean;
  variantCount?: number; // > 0: chosen on the suit page (each variant has its own stock)
};
/** Image variant: same design and price, its own photos and stock. */
export type PublicSuitVariant = { id: string; code: string; images: string[]; cover: string; inStock: boolean; maxQuantity: number };
export type PublicSuitDetail = PublicSuitListItem & {
  description: string; details: string; fabricImages: string[]; referenceImages: string[];
  variants?: PublicSuitVariant[];
  related: PublicSuitListItem[];
};
export type SuitList = { items: PublicSuitListItem[]; total: number; page: number; limit: number; pages: number };
export type SuitQuery = { q?: string; category?: string; sort?: string; page?: number; limit?: number; featured?: boolean };
export type PublicCategory = { id: string; name: string; slug: string; description: string };
export type CartValidation = { items: (ValidatedLine & { quantity: number })[]; subtotalPaise: number; canCheckout: boolean };

export const suitQueryString = (q: SuitQuery) => {
  const p = new URLSearchParams();
  if (q.q) p.set("q", q.q);
  if (q.category) p.set("category", q.category);
  if (q.sort && q.sort !== "newest") p.set("sort", q.sort);
  if (q.page && q.page > 1) p.set("page", String(q.page));
  if (q.limit) p.set("limit", String(q.limit));
  if (q.featured) p.set("featured", "true");
  return p.toString();
};

export const fetchSuits = async (q: SuitQuery) => (await apiJson<SuitList>(`/api/suits?${suitQueryString(q)}`, { skipLoader: true })).data;
export const fetchSuit = async (id: string) => (await apiJson<PublicSuitDetail>(`/api/suits/${encodeURIComponent(id)}`, { skipLoader: true })).data;
export const fetchSuitCategories = async () => (await apiJson<PublicCategory[]>("/api/suit-categories", { skipLoader: true })).data;
export const validateCartOnServer = async (items: { id: string; variantId?: string; quantity: number }[]) =>
  (await apiJson<CartValidation>("/api/suit-cart/validate", { method: "POST", body: JSON.stringify({ items }), skipLoader: true })).data;

let settingsPromise: Promise<{ whatsappNumber: string | null; boutiqueName: string }> | null = null;
/** Order WhatsApp number + boutique name (admin-managed, shared with the mobile app). Cached for the page lifetime. */
export const fetchShopSettings = () => {
  settingsPromise ??= apiJson<{ whatsappNumber: string | null; boutiqueName: string }>("/api/settings/public", { skipLoader: true })
    .then((r) => r.data)
    .catch(() => {
      settingsPromise = null;
      return { whatsappNumber: null, boutiqueName: "" };
    });
  return settingsPromise;
};
