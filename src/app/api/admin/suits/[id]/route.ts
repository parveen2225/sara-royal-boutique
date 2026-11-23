import type { NextRequest } from "next/server";
import UnstitchedSuit from "@/models/UnstitchedSuit";
import SuitCategory from "@/models/SuitCategory";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requireOwner, requirePermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { deleteCloudinaryImages } from "@/lib/cloudinary";
import { unreferencedImages } from "@/lib/assetRefs";
import SuitOrder from "@/models/SuitOrder";
import { BadRequestError, isObjectId, readJsonBody } from "@/lib/validation";
import { parseSuitInput, serializeAdminSuit, type SuitImage } from "@/lib/suitInput";

type Ctx = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

const load = (id: string) => UnstitchedSuit.findById(id).populate("categoryIds", "name slug active");

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

    const before: SuitImage[] = [...suit.fabricImages, ...suit.referenceImages].map((i: SuitImage) => ({ url: i.url, publicId: i.publicId }));
    suit.set(data); // sku is immutable; status/stock are rejected by the parser
    await suit.save(); // runs schema rules (e.g. a published suit must keep at least one fabric image)

    // Remove uploads that were taken out of this suit, unless ANY other record (another suit, a product, the gallery,
    // the invoice logo, ...) still uses the same file.
    const kept = new Set([...suit.fabricImages, ...suit.referenceImages].map((i: SuitImage) => i.url));
    const removed = before.filter((i) => !kept.has(i.url));
    if (removed.length) await deleteCloudinaryImages(await unreferencedImages(removed, { excludeSuitId: id }));

    await logAudit(auth.user, "suit.updated", { type: "suit", id }, `${suit.sku} ${suit.name}`, { fields: Object.keys(data) });
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
  await deleteCloudinaryImages(await unreferencedImages([...(suit.fabricImages ?? []), ...(suit.referenceImages ?? [])]));
  await logAudit(auth.user, "suit.deleted", { type: "suit", id }, `${suit.sku} ${suit.name}`, { status: suit.status, stock: suit.stock });
  return jsonOk({ id, sku: suit.sku });
}
