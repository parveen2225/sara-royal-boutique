import { isCloudinaryImageUrl, publicIdFromUrl } from "./cloudinaryUrl";
import { cleanText, isObjectId } from "./validation";
import { parseEventDate } from "./orderInput";

export type ReturnInput = {
  orderRef: string;
  type: "return" | "exchange";
  reasonType: "preference" | "wrong_item" | "defective";
  reasonNote: string;
  unusedUncutConfirmed: boolean;
  items: { suitId: string; variantId?: string; quantity: number }[];
  photos: { url: string; publicId: string }[];
  requestedAt?: Date;
  exceptionNote: string;
};
type Res<T> = { ok: true; data: T } | { ok: false; message: string };

export function parsePhotos(value: unknown, max = 10): Res<{ url: string; publicId: string }[]> {
  if (!Array.isArray(value)) return { ok: false, message: "Photos must be a list." };
  if (value.length > max) return { ok: false, message: `At most ${max} photos.` };
  const seen = new Set<string>();
  const out: { url: string; publicId: string }[] = [];
  for (const v of value) {
    const url = typeof v === "string" ? v : (v as { url?: unknown })?.url;
    if (!isCloudinaryImageUrl(url)) return { ok: false, message: "Photos must be images uploaded through the admin panel." };
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, publicId: publicIdFromUrl(url) });
  }
  return { ok: true, data: out };
}

export function parseReturnInput(body: Record<string, unknown>): Res<ReturnInput> {
  const fail = (message: string) => ({ ok: false as const, message });
  if (!isObjectId(body.orderId)) return fail("Choose the order this return belongs to.");
  if (body.type !== undefined && body.type !== "return" && body.type !== "exchange") return fail("Type must be return or exchange.");
  if (body.reasonType !== "preference" && body.reasonType !== "wrong_item" && body.reasonType !== "defective") return fail("Choose a reason: customer preference, wrong item or defective item.");
  const rawItems = body.items;
  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 50) return fail("Select the suit(s) being returned.");
  const seen = new Set<string>();
  const items: { suitId: string; variantId?: string; quantity: number }[] = [];
  for (const r of rawItems) {
    const row = (r ?? {}) as { suitId?: unknown; variantId?: unknown; quantity?: unknown };
    const variantId = row.variantId === undefined || row.variantId === null || row.variantId === "" ? undefined : row.variantId;
    const key = `${row.suitId}:${variantId ?? ""}`;
    if (!isObjectId(row.suitId) || (variantId !== undefined && !isObjectId(variantId)) || seen.has(key)) return fail("A returned item is invalid or repeated.");
    if (typeof row.quantity !== "number" || !Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > 999) return fail("Returned quantities must be whole numbers.");
    seen.add(key);
    items.push({ suitId: row.suitId, ...(variantId ? { variantId } : {}), quantity: row.quantity });
  }
  const photos = parsePhotos(body.photos ?? []);
  if (!photos.ok) return fail(photos.message);
  const requestedAt = parseEventDate(body.requestedAt);
  if (requestedAt === null) return fail("Request date is not valid.");

  // Customer-preference returns: item must be unused, uncut and in original condition. Wrong/defective: photo evidence is required.
  if (body.reasonType === "preference" && body.unusedUncutConfirmed !== true) return fail("For a preference return, confirm the item is unused, uncut and in its original condition.");
  if (body.reasonType !== "preference" && photos.data.length < 1) return fail("Photos are required for a wrong or defective item.");

  return { ok: true, data: { orderRef: body.orderId, type: (body.type as "return" | "exchange") ?? "return", reasonType: body.reasonType, reasonNote: cleanText(body.reasonNote, 1000), unusedUncutConfirmed: body.unusedUncutConfirmed === true, items, photos: photos.data, requestedAt: requestedAt ?? undefined, exceptionNote: cleanText(body.exceptionNote, 500) } };
}

/** Whole IST calendar days from delivery to the request (0 = same day). */
export function daysBetweenYmd(fromYmd: string, toYmd: string): number {
  const t = (s: string) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((t(toYmd) - t(fromYmd)) / 86400000);
}
