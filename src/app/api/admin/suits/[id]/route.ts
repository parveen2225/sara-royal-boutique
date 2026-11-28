import type { NextRequest } from "next/server";
import { Types } from "mongoose";
import UnstitchedSuit from "@/models/UnstitchedSuit";
import StockMovement from "@/models/StockMovement";
import { atomically } from "@/lib/atomic";
import SuitCategory from "@/models/SuitCategory";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requireOwner, requirePermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { deleteCloudinaryImages } from "@/lib/cloudinary";
import { unreferencedImages } from "@/lib/assetRefs";
import SuitOrder from "@/models/SuitOrder";
import { BadRequestError, isObjectId, readJsonBody } from "@/lib/validation";
import { parseSuitInput, planVariants, serializeAdminSuit, type SuitFields, type SuitImage } from "@/lib/suitInput";
import type { AuthUser } from "@/lib/auth/permissions";

type Ctx = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

const load = (id: string) => UnstitchedSuit.findById(id).populate("categoryIds", "name slug active");

type ImgDoc = { url: string; publicId: string };
type SuitImages = { fabricImages: ImgDoc[]; referenceImages: ImgDoc[]; variants?: { images: ImgDoc[] }[] };
/** Every image a suit uses (fabric, reference and variant photos). */
const allImages = (s: SuitImages): SuitImage[] =>
  [...s.fabricImages, ...s.referenceImages, ...(s.variants ?? []).flatMap((v) => v.images)].map((i) => ({ url: i.url, publicId: i.publicId }));

class StockMoved extends Error {}

/**
 * Save the product fields together with the variant list, as ONE conditional write that only applies if no stock
 * changed since the suit was read (an order or another admin may change it at any moment). Opening stock of new variants
 * is audited: the StockMovement rows are written in the same atomic unit, and removed again if the write does not apply.
 * A lost race is retried with fresh data, so stock is never overwritten by what the form saw.
 */
async function saveWithVariants(id: string, fields: Omit<SuitFields, "variants">, input: NonNullable<SuitFields["variants"]>, user: AuthUser) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const suit = await UnstitchedSuit.findById(id);
    if (!suit) return { error: jsonError("Suit not found", 404) };
    const plan = planVariants({ sku: suit.sku, stock: suit.stock, variantSeq: suit.variantSeq, variants: suit.variants }, input, () => new Types.ObjectId());
    if (!plan.ok) return { error: jsonError(plan.message, plan.status) };
    if ((plan.movedFromBase > 0 || plan.created.some((v) => v.stock > 0)) && !user.permissions.stock) return { error: jsonError("Forbidden: setting variant stock needs the stock permission", 403) };

    const before = allImages(suit);
    const seen = { stock: suit.stock, variants: suit.variants.map((v: { _id: unknown; stock: number }) => ({ _id: v._id, stock: v.stock })) };
    const $set = { ...fields, variants: plan.variants, stock: plan.stock, variantSeq: plan.variantSeq };
    suit.set($set);
    await suit.validate(); // schema rules: prices, a published suit keeps a fabric image, 1-6 images per variant, total = sum

    const filter: Record<string, unknown> = { _id: id, stock: seen.stock };
    if (seen.variants.length === 0) filter["variants.0"] = { $exists: false };
    else Object.assign(filter, { variants: { $size: seen.variants.length }, $and: seen.variants.map((v: { _id: unknown; stock: number }) => ({ variants: { $elemMatch: { _id: v._id, stock: v.stock } } })) });

    const rows = [
      ...(plan.movedFromBase > 0 ? [{ suitId: suit._id, sku: suit.sku, previousQty: plan.movedFromBase, change: -plan.movedFromBase, resultingQty: 0, reason: "correction", note: "Stock is now tracked per variant" }] : []),
      ...plan.created.filter((v) => v.stock > 0).map((v) => ({ suitId: suit._id, sku: v.code, variantId: v._id, previousQty: 0, change: v.stock, resultingQty: v.stock, reason: "initial", note: "Opening stock (new variant)" })),
    ].map((r) => ({ ...r, actorId: user.id, actorEmail: user.email }));

    try {
      await atomically(async ({ session, onUndo }) => {
        if (rows.length) {
          const created = await StockMovement.insertMany(rows, { session: session ?? undefined });
          onUndo(async () => { await StockMovement.deleteMany({ _id: { $in: created.map((c) => c._id) } }); });
        }
        const res = await UnstitchedSuit.updateOne(filter, { $set }, { session: session ?? undefined });
        if (res.matchedCount !== 1) throw new StockMoved();
      });
    } catch (error) {
      if (error instanceof StockMoved) continue; // stock changed meanwhile: re-read and re-plan
      throw error;
    }
    return { before, after: allImages(suit), sku: suit.sku as string, name: suit.name as string };
  }
  return { error: jsonError("Stock changed while saving. Please try again.", 409) };
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const auth = await requirePermission(req, "products");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Suit not found", 404);
  const suit = await load(id).lean();
  if (!suit) return jsonError("Suit not found", 404);
  return jsonOk(serializeAdminSuit(suit as never));
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const auth = await requirePermission(req, "products");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Suit not found", 404);
  try {
    const body = await readJsonBody(req);
    const suit = await UnstitchedSuit.findById(id);
    if (!suit) return jsonError("Suit not found", 404);

    const parsed = parseSuitInput(body, { isCreate: false, existing: { originalPricePaise: suit.originalPricePaise, salePricePaise: suit.salePricePaise } });
    if (!parsed.ok) return jsonError(parsed.message, 400);
    const data = parsed.data;
    if (Object.keys(data).length === 0) return jsonError("Nothing to update.", 400);

    if (data.categoryIds?.length) {
      const found = await SuitCategory.countDocuments({ _id: { $in: data.categoryIds } });
      if (found !== data.categoryIds.length) return jsonError("One or more categories do not exist.", 400);
    }

    let before: SuitImage[];
    let after: SuitImage[];
    let label: string;
    if (data.variants) {
      const { variants, ...fields } = data;
      const saved = await saveWithVariants(id, fields, variants, auth.user);
      if ("error" in saved) return saved.error;
      ({ before, after } = saved);
      label = `${saved.sku} ${saved.name}`;
    } else {
      before = allImages(suit);
      suit.set(data); // sku is immutable; status/stock are rejected by the parser
      await suit.save(); // runs schema rules (e.g. a published suit must keep at least one fabric image)
      after = allImages(suit);
      label = `${suit.sku} ${suit.name}`;
    }

    // Remove uploads that were taken out of this suit, unless ANY other record (another suit, a product, the gallery,
    // the invoice logo, ...) still uses the same file.
    const kept = new Set(after.map((i) => i.url));
    const removed = before.filter((i) => !kept.has(i.url));
    if (removed.length) await deleteCloudinaryImages(await unreferencedImages(removed, { excludeSuitId: id }));

    await logAudit(auth.user, "suit.updated", { type: "suit", id }, label, { fields: Object.keys(data) });
    return jsonOk(serializeAdminSuit((await load(id).lean()) as never));
  } catch (error) {
    if (error instanceof BadRequestError) return jsonError(error.message, 400);
    if ((error as { name?: string })?.name === "ValidationError") return jsonError(Object.values((error as { errors: Record<string, { message: string }> }).errors)[0]?.message ?? "Invalid suit", 400);
    console.error("[API /admin/suits/:id PUT]", error instanceof Error ? error.message : error);
    return jsonError("Could not update suit", 500);
  }
}

// Permanent deletion: owner only, explicit confirmation required. SKUs are never reissued (the counter only grows).
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await requireOwner(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Suit not found", 404);
  if (req.nextUrl.searchParams.get("confirm") !== "true") return jsonError("Permanent deletion must be confirmed.", 409);
  // A suit that appears on any order (or return) is part of the sales history and must not be deleted: archive it instead.
  if (await SuitOrder.exists({ "items.suitId": id })) return jsonError("This suit is on existing orders and cannot be deleted. Archive it instead.", 409);
  const suit = await UnstitchedSuit.findByIdAndDelete(id).lean();
  if (!suit) return jsonError("Suit not found", 404);
  await deleteCloudinaryImages(await unreferencedImages(allImages({ fabricImages: suit.fabricImages ?? [], referenceImages: suit.referenceImages ?? [], variants: suit.variants ?? [] })));
  await logAudit(auth.user, "suit.deleted", { type: "suit", id }, `${suit.sku} ${suit.name}`, { status: suit.status, stock: suit.stock });
  return jsonOk({ id, sku: suit.sku });
}
