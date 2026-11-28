import { Types } from "mongoose";

// Stock writes for suits with or without image variants. A variant suit's `stock` is the total of its variants, so
// every change to a variant also changes the total by the same amount IN THE SAME UPDATE (one document, atomic).

type VariantLike = { _id: unknown; code: string; stock: number; images?: { url: string }[] };
type SuitLike = { _id: unknown; sku: string; stock: number; variants?: VariantLike[] };

const oid = (v: unknown) => (v instanceof Types.ObjectId ? v : new Types.ObjectId(String(v)));

export const findVariant = (suit: Pick<SuitLike, "variants">, variantId: unknown): VariantLike | undefined =>
  variantId ? suit.variants?.find((v) => String(v._id) === String(variantId)) : undefined;

export const hasVariants = (suit: Pick<SuitLike, "variants">) => (suit.variants?.length ?? 0) > 0;

export type StockOp = { filter: Record<string, unknown>; update: Record<string, unknown>; options: { arrayFilters?: Record<string, unknown>[] } };

/**
 * Conditional `$inc` by `delta`. Never lets the (variant's) stock go below zero; with `max`, never above it.
 * Without a variant it only matches suits that have NO variants, so a variant suit's total can never drift from the
 * sum of its variants (a request that does not say which variant matches nothing).
 */
export function stockIncOp(suitId: unknown, variantId: unknown, delta: number, max?: number): StockOp {
  const bound = delta < 0 ? { $gte: -delta } : max !== undefined ? { $lte: max - delta } : undefined;
  if (variantId) {
    const vid = oid(variantId);
    return {
      filter: { _id: suitId, variants: { $elemMatch: { _id: vid, ...(bound ? { stock: bound } : {}) } } },
      update: { $inc: { stock: delta, "variants.$[v].stock": delta } },
      options: { arrayFilters: [{ "v._id": vid }] },
    };
  }
  return { filter: { _id: suitId, "variants.0": { $exists: false }, ...(bound ? { stock: bound } : {}) }, update: { $inc: { stock: delta } }, options: {} };
}

/** Quantity a stock movement reports: the variant's when there is one, otherwise the suit's. */
export const trackedQty = (suit: SuitLike, variantId: unknown) => (variantId ? findVariant(suit, variantId)?.stock ?? 0 : suit.stock);

/** SKU written on order lines and stock movements: the variant code (SR-0005-V2) for a variant, else the suit SKU. */
export const trackedSku = (suit: SuitLike, variantId: unknown) => (variantId ? findVariant(suit, variantId)?.code ?? suit.sku : suit.sku);

/**
 * Where returned / cancelled units go back to. Normally the same variant. If the suit's variants changed since the
 * order (variant removed, or variants added to a suit that had none), the units go to the first variant, or to the
 * suit itself when it has no variants any more, so stock is always restored and the total stays consistent.
 */
export function restoreTarget(suit: SuitLike, variantId: unknown): string | null {
  if (!hasVariants(suit)) return null;
  const v = findVariant(suit, variantId) ?? suit.variants![0];
  return String(v._id);
}
