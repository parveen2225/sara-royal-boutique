import { discountPercent } from "./money";

type Img = { url: string };
type CatLike = { _id: unknown; name: string; slug: string; active?: boolean };
type SuitDoc = {
  _id: unknown; sku: string; name: string; description?: string; details?: string; fabric?: string; color?: string;
  originalPricePaise: number; salePricePaise: number; stock: number; categoryIds?: unknown[];
  fabricImages?: Img[]; referenceImages?: Img[]; featured?: boolean; createdAt?: Date | string;
};

const activeCategories = (s: SuitDoc) =>
  (s.categoryIds ?? [])
    .filter((c): c is CatLike => !!c && typeof c === "object" && "name" in (c as object) && (c as CatLike).active !== false)
    .map((c) => ({ id: String(c._id), name: c.name, slug: c.slug }));

/** Card/list shape. Never includes admin-only data (status, exact low-stock bands, publicIds, timestamps of edits). */
export function toPublicListItem(s: SuitDoc) {
  return {
    id: String(s._id),
    sku: s.sku,
    name: s.name,
    fabric: s.fabric ?? "",
    color: s.color ?? "",
    originalPricePaise: s.originalPricePaise,
    salePricePaise: s.salePricePaise,
    originalPrice: s.originalPricePaise / 100,
    salePrice: s.salePricePaise / 100,
    discountPercent: discountPercent(s.originalPricePaise, s.salePricePaise),
    inStock: s.stock > 0,
    maxQuantity: Math.max(0, s.stock), // used to cap the quantity selector
    cover: s.fabricImages?.[0]?.url ?? "",
    categories: activeCategories(s),
    featured: Boolean(s.featured),
  };
}

export function toPublicDetail(s: SuitDoc) {
  return {
    ...toPublicListItem(s),
    description: s.description ?? "",
    details: s.details ?? "",
    fabricImages: (s.fabricImages ?? []).map((i) => i.url),
    referenceImages: (s.referenceImages ?? []).map((i) => i.url), // always labelled "stitched reference" by the clients
    createdAt: s.createdAt,
  };
}

export type PublicListItem = ReturnType<typeof toPublicListItem>;
