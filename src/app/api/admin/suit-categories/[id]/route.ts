import type { NextRequest } from "next/server";
import SuitCategory from "@/models/SuitCategory";
import UnstitchedSuit from "@/models/UnstitchedSuit";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requirePermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { BadRequestError, cleanText, isObjectId, readJsonBody } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  const auth = await requirePermission(req, "products");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Category not found", 404);
  try {
    const body = await readJsonBody(req);
    const $set: Record<string, unknown> = {};
    if ("name" in body) {
      const name = cleanText(body.name, 80);
      if (!name) return jsonError("Category name is required.", 400);
      $set.name = name; // slug stays stable so links and API consumers never break
    }
    if ("description" in body) $set.description = cleanText(body.description, 500);
    if ("active" in body) $set.active = body.active === true;
    if ("displayOrder" in body && Number.isInteger(body.displayOrder)) $set.displayOrder = body.displayOrder;
    if (!Object.keys($set).length) return jsonError("Nothing to update.", 400);
    const cat = await SuitCategory.findByIdAndUpdate(id, { $set }, { returnDocument: "after" }).lean();
    if (!cat) return jsonError("Category not found", 404);
    await logAudit(auth.user, "suit_category.updated", { type: "suit_category", id }, cat.name, { fields: Object.keys($set) });
    return jsonOk({ id, name: cat.name, slug: cat.slug, active: cat.active });
  } catch (error) {
    if (error instanceof BadRequestError) return jsonError(error.message, 400);
    console.error("[API /admin/suit-categories PUT]", error instanceof Error ? error.message : error);
    return jsonError("Could not update category", 500);
  }
}

// Deleting a category that is assigned to suits needs ?confirm=true; the id is then removed from those suits
// (the suits themselves are untouched and remain in All Suits).
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await requirePermission(req, "products");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Category not found", 404);
  const assigned = await UnstitchedSuit.countDocuments({ categoryIds: id });
  if (assigned > 0 && req.nextUrl.searchParams.get("confirm") !== "true") {
    return jsonError(`This category is assigned to ${assigned} suit(s). Confirm to remove it from them.`, 409);
  }
  const cat = await SuitCategory.findByIdAndDelete(id).lean();
  if (!cat) return jsonError("Category not found", 404);
  if (assigned > 0) await UnstitchedSuit.updateMany({ categoryIds: id }, { $pull: { categoryIds: id } });
  await logAudit(auth.user, "suit_category.deleted", { type: "suit_category", id }, cat.name, { suitsUpdated: assigned });
  return jsonOk({ id, suitsUpdated: assigned });
}
