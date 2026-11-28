// Pure cart logic shared (by contract) with the mobile app. No imports: unit-tested directly.

export const CART_STORAGE_KEY = "sr_suit_cart_v1";
export const MAX_CART_LINES = 50;
export const MAX_LINE_QTY = 99;

export type CartItem = {
  id: string; // suit id
  sku: string;
  name: string;
  image: string;
  unitPricePaise: number;
  quantity: number;
  maxQuantity: number; // available stock when last seen
  variantId?: string; // image variant of the suit (its own stock); absent for suits without variants
  variantCode?: string; // e.g. SR-0005-V2, shown to the customer and sent in the WhatsApp order
};

const OBJECT_ID = /^[a-f\d]{24}$/i;

/** Identity of a cart line: the suit, or the suit + variant. For suits without variants this is just the suit id. */
export const lineKey = (i: { id: string; variantId?: string }) => (i.variantId ? `${i.id}:${i.variantId}` : i.id);

export type CartIssue = "not_found" | "unavailable" | "out_of_stock" | "insufficient_stock";

const isInt = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);

/** Parse whatever is in storage; anything malformed is dropped rather than crashing the page. */
export function parseStoredCart(raw: string | null | undefined): CartItem[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const items: CartItem[] = [];
  for (const row of data) {
    const r = row as Partial<CartItem> | null;
    if (!r || typeof r.id !== "string" || !OBJECT_ID.test(r.id)) continue;
    const variantId = typeof r.variantId === "string" && OBJECT_ID.test(r.variantId) ? r.variantId : undefined;
    const key = lineKey({ id: r.id, variantId });
    if (seen.has(key)) continue;
    if (typeof r.name !== "string" || typeof r.sku !== "string" || !isInt(r.unitPricePaise) || r.unitPricePaise < 0) continue;
    if (!isInt(r.quantity) || r.quantity < 1) continue;
    const maxQuantity = isInt(r.maxQuantity) && r.maxQuantity >= 0 ? r.maxQuantity : 0;
    seen.add(key);
    const variant = variantId ? { variantId, variantCode: typeof r.variantCode === "string" ? r.variantCode.slice(0, 40) : "" } : {};
    items.push({ id: r.id, sku: r.sku, name: r.name.slice(0, 160), image: typeof r.image === "string" ? r.image : "", unitPricePaise: r.unitPricePaise, quantity: Math.min(r.quantity, MAX_LINE_QTY), maxQuantity, ...variant });
    if (items.length >= MAX_CART_LINES) break;
  }
  return items;
}

export const serializeCart = (items: CartItem[]) => JSON.stringify(items);

/** Quantity can never exceed the stock we know about (or MAX_LINE_QTY). */
export const clampQuantity = (qty: number, maxQuantity: number) => Math.max(0, Math.min(Math.floor(qty) || 0, maxQuantity, MAX_LINE_QTY));

export type AddResult = { items: CartItem[]; added: number; capped: boolean; error?: "out_of_stock" | "cart_full" };

/** Add `qty` units; merges with an existing line (same suit and variant) and never goes above available stock. */
export function addToCart(items: CartItem[], item: Omit<CartItem, "quantity">, qty: number): AddResult {
  if (item.maxQuantity <= 0) return { items, added: 0, capped: false, error: "out_of_stock" };
  const key = lineKey(item);
  const existing = items.find((i) => lineKey(i) === key);
  if (!existing && items.length >= MAX_CART_LINES) return { items, added: 0, capped: false, error: "cart_full" };
  const current = existing?.quantity ?? 0;
  const target = clampQuantity(current + Math.max(1, Math.floor(qty) || 1), item.maxQuantity);
  const added = target - current;
  const next: CartItem = { ...item, quantity: target };
  return { items: existing ? items.map((i) => (lineKey(i) === key ? next : i)) : [...items, next], added, capped: current + Math.max(1, Math.floor(qty) || 1) > target };
}

/** `key` is the line's lineKey() (the suit id for suits without variants). */
export function setQuantity(items: CartItem[], key: string, qty: number): CartItem[] {
  return items.flatMap((i) => {
    if (lineKey(i) !== key) return [i];
    const q = clampQuantity(qty, i.maxQuantity);
    return q < 1 ? [] : [{ ...i, quantity: q }]; // 0 removes the line
  });
}

export const removeFromCart = (items: CartItem[], key: string) => items.filter((i) => lineKey(i) !== key);
export const lineTotalPaise = (i: Pick<CartItem, "unitPricePaise" | "quantity">) => i.unitPricePaise * i.quantity;
export const cartSubtotalPaise = (items: CartItem[]) => items.reduce((sum, i) => sum + lineTotalPaise(i), 0);
export const cartCount = (items: CartItem[]) => items.reduce((sum, i) => sum + i.quantity, 0);

export type ValidatedLine = {
  id: string;
  variantId?: string;
  variantCode?: string;
  ok: boolean;
  issue?: CartIssue;
  name?: string;
  sku?: string;
  image?: string;
  unitPricePaise?: number;
  maxQuantity?: number;
};

/**
 * Merge server validation back into the cart: refresh price/name/stock, clamp quantities to stock, and report what
 * changed so the UI can tell the customer. Lines with problems stay in the cart (never silently dropped).
 * `issues` is keyed by lineKey() (the suit id for suits without variants).
 */
export function applyValidation(items: CartItem[], lines: ValidatedLine[]) {
  const byKey = new Map(lines.map((l) => [lineKey(l), l]));
  const issues: Record<string, CartIssue> = {};
  const changes: string[] = [];
  const next = items.map((item) => {
    const key = lineKey(item);
    const v = byKey.get(key);
    if (!v) return item;
    if (!v.ok && (v.issue === "not_found" || v.issue === "unavailable" || v.issue === "out_of_stock")) {
      issues[key] = v.issue;
      return { ...item, maxQuantity: 0 };
    }
    const updated: CartItem = {
      ...item,
      name: v.name ?? item.name,
      sku: v.sku ?? item.sku,
      image: v.image ?? item.image,
      unitPricePaise: v.unitPricePaise ?? item.unitPricePaise,
      maxQuantity: v.maxQuantity ?? item.maxQuantity,
      ...(item.variantId ? { variantCode: v.variantCode ?? item.variantCode } : {}),
    };
    if (updated.unitPricePaise !== item.unitPricePaise) changes.push(`${updated.name}: price updated`);
    if (updated.quantity > updated.maxQuantity) {
      changes.push(`${updated.name}${updated.variantCode ? ` (${updated.variantCode})` : ""}: only ${updated.maxQuantity} available`);
      issues[key] = "insufficient_stock";
      updated.quantity = Math.max(1, updated.maxQuantity);
    }
    return updated;
  });
  // "insufficient_stock" is informational: the quantity was already reduced to what is available, so the cart is
  // consistent and can proceed. The other issues need the customer to remove the line first.
  const blocking = Object.values(issues).some((i) => i !== "insufficient_stock");
  return { items: next, issues, changes, canCheckout: next.length > 0 && !blocking };
}
