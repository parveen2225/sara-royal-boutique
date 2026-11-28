"use client";

import { CART_STORAGE_KEY, addToCart, parseStoredCart, removeFromCart, serializeCart, setQuantity, type AddResult, type CartItem } from "@/lib/cartCore";

const EMPTY: CartItem[] = [];
let cache: { raw: string | null; items: CartItem[] } = { raw: null, items: EMPTY };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// External store backed by localStorage: survives refresh, syncs across tabs, and degrades to in-memory when
// storage is blocked (private mode etc.).
function read(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (raw === cache.raw) return cache.items;
    cache = { raw, items: raw ? parseStoredCart(raw) : EMPTY };
  } catch {
    /* storage unavailable: keep the in-memory copy */
  }
  return cache.items;
}

function write(items: CartItem[]) {
  const raw = serializeCart(items);
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, raw);
  } catch {
    /* in-memory only */
  }
  cache = { raw, items };
  emit();
}

export const cartStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY || e.key === null) emit();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot: read,
  getServerSnapshot: () => EMPTY,
  add(item: Omit<CartItem, "quantity">, qty: number): AddResult {
    const result = addToCart(read(), item, qty);
    if (result.items !== read()) write(result.items);
    return result;
  },
  // `key` = lineKey(item): the suit id, or "suitId:variantId" for a variant line
  setQuantity: (key: string, qty: number) => write(setQuantity(read(), key, qty)),
  remove: (key: string) => write(removeFromCart(read(), key)),
  replaceAll: (items: CartItem[]) => write(items),
  clear: () => write(EMPTY), // only ever called from an explicit "Clear cart" action
};
