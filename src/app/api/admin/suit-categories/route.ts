import type { NextRequest } from "next/server";
import SuitCategory from "@/models/SuitCategory";
import UnstitchedSuit from "@/models/UnstitchedSuit";
import { createSlug, jsonError, jsonOk } from "@/lib/api/utils";
import { requirePermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { BadRequestError, cleanText, readJsonBody } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "products");
  if (!auth.ok) return auth.response;
  const [cats, counts] = await Promise.all([
    SuitCategory.find().sort({ displayOrder: 1, name: 1 }).lean(),
    UnstitchedSuit.aggregate([{ $unwind: "$categoryIds" }, { $group: { _id: "$categoryIds", n: { $sum: 1 } } }]),
  ]);
  const byId = new Map(counts.map((c: { _id: unknown; n: number }) => [String(c._id), c.n]));
  return jsonOk(cats.map((c) => ({ id: String(c._id), name: c.name, slug: c.slug, description: c.description, active: c.active, displayOrder: c.displayOrder, suitCount: byId.get(String(c._id)) ?? 0 })));
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "products");
  if (!auth.ok) return auth.response;
  try {
    const body = await readJsonBody(req);
    const name = cleanText(body.name, 80);
    if (!name) return jsonError("Category name is required.", 400);
    const slug = createSlug(name);
    if (!slug) return jsonError("Category name must contain letters or numbers.", 400);
    if (await SuitCategory.exists({ slug })) return jsonError("A category with this name already exists.", 409);
    const cat = await SuitCategory.create({
      name,
      slug,
      description: cleanText(body.description, 500),
      active: body.active !== false,
      displayOrder: Number.isInteger(body.displayOrder) ? Number(body.displayOrder) : 0,
    });
    await logAudit(auth.user, "suit_category.created", { type: "suit_category", id: String(cat._id) }, name);
    return jsonOk({ id: String(cat._id), name: cat.name, slug: cat.slug }, { status: 201 });
  } catch (error) {
    if (error instanceof BadRequestError) return jsonError(error.message, 400);
    if ((error as { code?: number })?.code === 11000) return jsonError("A category with this name already exists.", 409);
    console.error("[API /admin/suit-categories POST]", error instanceof Error ? error.message : error);
    return jsonError("Could not create category", 500);
  }
}
