"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { cartStore } from "@/lib/cartStore";
import { cartCount, cartSubtotalPaise } from "@/lib/cartCore";
import { fetchShopSettings } from "@/lib/shopApi";

export function useCart() {
  const items = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  return { items, count: cartCount(items), subtotalPaise: cartSubtotalPaise(items) };
}

/** `ready` is false until the first answer; `whatsappNumber` null means ordering is not configured. */
export function useShopSettings() {
  const [s, setS] = useState<{ whatsappNumber: string | null; boutiqueName: string; ready: boolean }>({ whatsappNumber: null, boutiqueName: "", ready: false });
  useEffect(() => {
    let cancelled = false;
    fetchShopSettings().then((r) => !cancelled && setS({ ...r, ready: true }));
    return () => {
      cancelled = true;
    };
  }, []);
  return s;
}
