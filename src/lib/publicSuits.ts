import { discountPercent } from "./money";

type Img = { url: string };
type CatLike = { _id: unknown; name: string; slug: string; active?: boolean };
type SuitDoc = {
  _id: unknown; sku: string; name: string; description?: string; details?: string; fabric?: string; color?: string;
  originalPricePaise: number; salePricePaise: number; stock: number; categoryIds?: unknown[];
  fabricImages?: Img[]; referenceImages?: Img[]; featured?: boolean; createdAt?: Date | string;
  variants?: { _id: unknown; code: string; stock: number; images?: Img[] }[];
};

const activeCategories = (s: SuitDoc) =>
  (s.categoryIds ?? [])
    .filter((c): c is CatLike => !!c && typeof c === "object" && "name" in (c as object) && (c as CatLike).active !== false)
    .map((c) => ({ id: String(c._id), name: c.name, slug: c.slug }));

export const CARD_GALLERY_MAX = 4;

/**
 * Photos a product card can flip through (first = cover). Plain suits: their uploaded fabric photos. Variant suits: the
 * cover, then each variant's first photo (so the card previews the available colours), then the other fabric photos.
 */
function cardGallery(s: SuitDoc): string[] {
  const fabric = (s.fabricImages ?? []).map((i) => i.url);
  const variantCovers = (s.variants ?? []).map((v) => v.images?.[0]?.url ?? "");
  const ordered = s.variants?.length ? [fabric[0] ?? "", ...variantCovers, ...fabric.slice(1)] : fabric;
  return [...new Set(ordered.filter(Boolean))];
}

/** Card/list shape. Never includes admin-only data (status, exact low-stock bands, publicIds, timestamps of edits). */
/** For each card photo of a variant suit: the design whose cover it is (null for a general suit photo). */
function cardImageVariants(s: SuitDoc, images: string[]) {
  const byCover = new Map((s.variants ?? []).filter((v) => v.images?.[0]?.url).map((v) => [v.images![0].url, v]));
  return images.map((url) => {
    const v = byCover.get(url);
    return v ? { id: String(v._id), code: v.code, inStock: v.stock > 0 } : null;
  });
}

export function toPublicListItem(s: SuitDoc) {
  const gallery = cardGallery(s);
  const images = gallery.slice(0, CARD_GALLERY_MAX);
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
    images, // card thumbnails (first = cover)
    imageCount: gallery.length,
    ...(s.variants?.length ? { imageVariants: cardImageVariants(s, images) } : {}), // which design each thumbnail shows
    categories: activeCategories(s),
    featured: Boolean(s.featured),
    variantCount: s.variants?.length ?? 0, // > 0: the customer picks a variant on the suit page (each has its own stock)
  };
}

export function toPublicDetail(s: SuitDoc) {
  return {
    ...toPublicListItem(s),
    description: s.description ?? "",
    details: s.details ?? "",
    fabricImages: (s.fabricImages ?? []).map((i) => i.url),
    referenceImages: (s.referenceImages ?? []).map((i) => i.url), // always labelled "stitched reference" by the clients
    // Image variants (same design, other colours). Each has its own photos and stock; the price is the suit's.
    variants: (s.variants ?? []).map((v) => ({
      id: String(v._id),
      code: v.code,
      images: (v.images ?? []).map((i) => i.url),
      cover: v.images?.[0]?.url ?? "",
      inStock: v.stock > 0,
      maxQuantity: Math.max(0, v.stock),
    })),
    createdAt: s.createdAt,
  };
}

export type PublicListItem = ReturnType<typeof toPublicListItem>;
