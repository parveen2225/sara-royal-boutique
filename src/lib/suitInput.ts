import { checkPricing, discountPercent, formatPaise } from "./money";
import { isCloudinaryImageUrl, publicIdFromUrl } from "./cloudinaryUrl";
import { cleanText, isObjectId } from "./validation";

export const MAX_FABRIC = 10;
export const MAX_REFERENCE = 5;
export const LOW_STOCK_MAX = 3; // 1-3 = low (admin warning only), 4+ normal, 0 = out of stock
export const MAX_STOCK = 100000;
export const CREATABLE_STATUSES = ["draft", "published", "archived"] as const;
export const MAX_VARIANTS = 12; // same limits as the model (models/UnstitchedSuit.ts)
export const MAX_VARIANT_IMAGES = 6;

export type StockState = "in_stock" | "low_stock" | "out_of_stock";
export const stockState = (qty: number): StockState => (qty <= 0 ? "out_of_stock" : qty <= LOW_STOCK_MAX ? "low_stock" : "in_stock");

export type SuitImage = { url: string; publicId: string };

/** Validate an ordered list of images (strings or {url}); order is preserved, the first one is the cover. */
export function parseImages(value: unknown, max: number, label: string): { ok: true; images: SuitImage[] } | { ok: false; message: string } {
  if (!Array.isArray(value)) return { ok: false, message: `${label} must be a list.` };
  if (value.length > max) return { ok: false, message: `You can add at most ${max} ${label.toLowerCase()}.` };
  const seen = new Set<string>();
  const images: SuitImage[] = [];
  for (const item of value) {
    const url = typeof item === "string" ? item : (item as { url?: unknown } | null)?.url;
    if (!isCloudinaryImageUrl(url)) return { ok: false, message: `${label} must be images uploaded through the admin panel.` };
    if (seen.has(url)) return { ok: false, message: `${label} contains the same image twice.` };
    seen.add(url);
    images.push({ url, publicId: publicIdFromUrl(url) });
  }
  return { ok: true, images };
}

/** Variant row from the admin form. `id` = an existing variant; `stock` is only read for NEW variants (opening stock). */
export type VariantInput = { id?: string; images: SuitImage[]; stock?: number };

const blank = (v: unknown) => v === undefined || v === null || v === "";

/**
 * Validate the full, ordered variant list. The stock of an existing variant is never taken from the form (it only
 * changes through orders, returns and the stock action), so a stale form can never overwrite it.
 */
export function parseVariants(value: unknown, isCreate: boolean): { ok: true; variants: VariantInput[] } | { ok: false; message: string } {
  const fail = (message: string) => ({ ok: false as const, message });
  if (!Array.isArray(value)) return fail("Variants must be a list.");
  if (value.length > MAX_VARIANTS) return fail(`You can add at most ${MAX_VARIANTS} variants.`);
  const ids = new Set<string>();
  const variants: VariantInput[] = [];
  for (const [i, raw] of value.entries()) {
    const row = (raw ?? {}) as { id?: unknown; images?: unknown; stock?: unknown };
    const label = `Variant ${i + 1}`;
    let id: string | undefined;
    if (!isCreate && !blank(row.id)) {
      if (!isObjectId(row.id) || ids.has(row.id)) return fail(`${label} is invalid. Reload the page and try again.`);
      id = row.id;
      ids.add(id);
    }
    const imgs = parseImages(row.images ?? [], MAX_VARIANT_IMAGES, `${label} images`);
    if (!imgs.ok) return fail(imgs.message);
    if (imgs.images.length < 1) return fail(`${label} needs at least one image.`);
    let stock: number | undefined;
    if (!id && !blank(row.stock)) {
      const n = row.stock;
      if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > MAX_STOCK) return fail(`${label} stock must be a whole number from 0 to ${MAX_STOCK}.`);
      stock = n;
    }
    variants.push({ id, images: imgs.images, stock });
  }
  return { ok: true, variants };
}

type CurrentVariant = { _id: unknown; code: string; stock: number };
export type PlannedVariant = { _id: unknown; code: string; images: SuitImage[]; stock: number };
export type VariantPlan =
  | { ok: true; variants: PlannedVariant[]; stock: number; variantSeq: number; created: PlannedVariant[]; removed: CurrentVariant[]; movedFromBase: number }
  | { ok: false; status: number; message: string };

/**
 * Turn the submitted variant list into the stored one. Existing variants keep their code and CURRENT stock; new ones get
 * the next code and their opening stock. A variant that still has stock cannot be removed (its units would vanish
 * without an audit row). When a suit gets its first variants, stock becomes the variants' total: the previous
 * suit-level quantity is reported as `movedFromBase` so the caller records it.
 */
export function planVariants(
  current: { sku: string; stock: number; variantSeq?: number; variants?: CurrentVariant[] },
  input: VariantInput[],
  newId: () => unknown,
): VariantPlan {
  const cur = current.variants ?? [];
  const byId = new Map(cur.map((v) => [String(v._id), v]));
  if (input.some((v) => v.id && !byId.has(v.id))) return { ok: false, status: 409, message: "A variant was changed by someone else. Reload the page and try again." };
  const kept = new Set(input.map((v) => v.id).filter(Boolean));
  const removed = cur.filter((v) => !kept.has(String(v._id)));
  const stocked = removed.find((v) => v.stock > 0);
  if (stocked) return { ok: false, status: 409, message: `Variant ${stocked.code} still has ${stocked.stock} in stock. Set its stock to 0 with “Adjust stock” before removing it.` };

  const codeNums = cur.map((v) => Number(/-V(\d+)$/.exec(v.code)?.[1] ?? 0));
  let seq = Math.max(current.variantSeq ?? 0, 0, ...codeNums);
  const created: PlannedVariant[] = [];
  const variants = input.map((v): PlannedVariant => {
    const existing = v.id ? byId.get(v.id) : undefined;
    if (existing) return { _id: existing._id, code: existing.code, images: v.images, stock: existing.stock };
    seq += 1;
    const fresh = { _id: newId(), code: `${current.sku}-V${seq}`, images: v.images, stock: v.stock ?? 0 };
    created.push(fresh);
    return fresh;
  });
  const total = variants.reduce((sum, v) => sum + v.stock, 0);
  const movedFromBase = cur.length === 0 && variants.length > 0 ? current.stock : 0;
  const stock = variants.length > 0 ? total : cur.length > 0 ? 0 : current.stock;
  return { ok: true, variants, stock, variantSeq: seq, created, removed, movedFromBase };
}

export type SuitFields = {
  name?: string;
  description?: string;
  details?: string;
  fabric?: string;
  color?: string;
  originalPricePaise?: number;
  salePricePaise?: number;
  categoryIds?: string[];
  fabricImages?: SuitImage[];
  referenceImages?: SuitImage[];
  featured?: boolean;
  stock?: number;
  status?: (typeof CREATABLE_STATUSES)[number];
  variants?: VariantInput[];
};

type Existing = { originalPricePaise: number; salePricePaise: number };

/**
 * Parse a create (isCreate) or partial-update payload. `status` and `stock` are accepted on create only: afterwards
 * they change through their own endpoints so they are permission-checked and audited/logged separately.
 */
export function parseSuitInput(body: Record<string, unknown>, opts: { isCreate: boolean; existing?: Existing }): { ok: true; data: SuitFields } | { ok: false; message: string } {
  const data: SuitFields = {};
  const fail = (message: string) => ({ ok: false as const, message });

  if (!opts.isCreate) {
    if ("status" in body) return fail("Use the status action to publish, archive or restore a suit.");
    if ("stock" in body) return fail("Use the stock action to change stock.");
  }
  if ("sku" in body && !opts.isCreate) return fail("SKU cannot be changed.");

  if (opts.isCreate || "name" in body) {
    const name = cleanText(body.name, 160);
    if (!name) return fail("Suit name is required.");
    data.name = name;
  }
  for (const [key, max] of [["description", 4000], ["details", 4000], ["fabric", 120], ["color", 80]] as const) {
    if (key in body) {
      if (typeof body[key] !== "string") return fail(`${key} must be text.`);
      data[key] = cleanText(body[key], max);
    }
  }

  const hasOriginal = "originalPrice" in body;
  const hasSale = "salePrice" in body;
  if (opts.isCreate && !hasOriginal) return fail("Original price is required.");
  if (hasOriginal || hasSale) {
    const originalInput = hasOriginal ? body.originalPrice : formatPaise(opts.existing!.originalPricePaise);
    // Sale defaults to the original price on create; on update it stays at its stored value.
    const saleInput = hasSale ? body.salePrice : opts.isCreate ? undefined : formatPaise(opts.existing!.salePricePaise);
    const price = checkPricing(originalInput, saleInput);
    if (!price.ok) return fail(price.message);
    data.originalPricePaise = price.originalPaise;
    data.salePricePaise = price.salePaise;
  }

  if ("categoryIds" in body) {
    if (!Array.isArray(body.categoryIds) || body.categoryIds.length > 20 || !body.categoryIds.every(isObjectId)) return fail("Categories are invalid.");
    data.categoryIds = [...new Set(body.categoryIds as string[])];
  }
  if ("fabricImages" in body) {
    const r = parseImages(body.fabricImages, MAX_FABRIC, "Fabric images");
    if (!r.ok) return fail(r.message);
    data.fabricImages = r.images;
  }
  if ("referenceImages" in body) {
    const r = parseImages(body.referenceImages, MAX_REFERENCE, "Reference images");
    if (!r.ok) return fail(r.message);
    data.referenceImages = r.images;
  }
  if ("featured" in body) {
    if (typeof body.featured !== "boolean") return fail("Featured must be true or false.");
    data.featured = body.featured;
  }

  if ("variants" in body) {
    const r = parseVariants(body.variants, opts.isCreate);
    if (!r.ok) return fail(r.message);
    data.variants = r.variants;
  }

  if (opts.isCreate) {
    if ("stock" in body) {
      const s = body.stock;
      if (typeof s !== "number" || !Number.isInteger(s) || s < 0 || s > MAX_STOCK) return fail(`Stock must be a whole number from 0 to ${MAX_STOCK}.`);
      data.stock = s;
    }
    if ("status" in body) {
      if (!(CREATABLE_STATUSES as readonly string[]).includes(body.status as string)) return fail("Status is invalid.");
      data.status = body.status as SuitFields["status"];
    }
    if (data.status === "published" && (data.fabricImages?.length ?? 0) < 1) return fail("Add at least one fabric image before publishing.");
    // A variant suit's stock is always the total of its variants.
    if (data.variants?.length) data.stock = data.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
  }
  return { ok: true, data };
}

type SuitLike = {
  _id: unknown; sku: string; name: string; description?: string; details?: string; fabric?: string; color?: string;
  originalPricePaise: number; salePricePaise: number; stock: number; categoryIds?: unknown[];
  fabricImages?: SuitImage[]; referenceImages?: SuitImage[]; featured?: boolean; status: string; createdAt?: Date; updatedAt?: Date;
  variants?: { _id: unknown; code: string; stock: number; images?: SuitImage[] }[];
};

/** Admin representation (full). Public APIs in later phases use their own, narrower shape. */
export function serializeAdminSuit(s: SuitLike) {
  const cats = (s.categoryIds ?? []).map((c) => (c && typeof c === "object" && "name" in (c as object) ? c as { _id: unknown; name: string; slug: string; active: boolean } : null));
  return {
    id: String(s._id),
    sku: s.sku,
    name: s.name,
    description: s.description ?? "",
    details: s.details ?? "",
    fabric: s.fabric ?? "",
    color: s.color ?? "",
    originalPrice: s.originalPricePaise / 100,
    salePrice: s.salePricePaise / 100,
    originalPricePaise: s.originalPricePaise,
    salePricePaise: s.salePricePaise,
    discountPercent: discountPercent(s.originalPricePaise, s.salePricePaise),
    stock: s.stock,
    stockState: stockState(s.stock),
    categoryIds: (s.categoryIds ?? []).map((c) => String(c && typeof c === "object" && "_id" in (c as object) ? (c as { _id: unknown })._id : c)),
    categories: cats.filter(Boolean).map((c) => ({ id: String(c!._id), name: c!.name, slug: c!.slug, active: c!.active })),
    fabricImages: (s.fabricImages ?? []).map((i) => ({ url: i.url, publicId: i.publicId })),
    referenceImages: (s.referenceImages ?? []).map((i) => ({ url: i.url, publicId: i.publicId })),
    variants: (s.variants ?? []).map((v) => ({ id: String(v._id), code: v.code, stock: v.stock, stockState: stockState(v.stock), images: (v.images ?? []).map((i) => ({ url: i.url, publicId: i.publicId })) })),
    featured: Boolean(s.featured),
    status: s.status,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export const escapeRegex = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
