import type { NextRequest } from "next/server";
import UnstitchedSuit, { nextSku } from "@/models/UnstitchedSuit";
import SuitCategory from "@/models/SuitCategory";
import StockMovement from "@/models/StockMovement";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requirePermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { BadRequestError, cleanText, isObjectId, readJsonBody } from "@/lib/validation";
import { escapeRegex, parseSuitInput, serializeAdminSuit, LOW_STOCK_MAX } from "@/lib/suitInput";

export const dynamic = "force-dynamic";

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  price_asc: { salePricePaise: 1, _id: 1 },
  price_desc: { salePricePaise: -1, _id: -1 },
};
const PAGE_SIZES = [10, 20, 50];

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "products");
  if (!auth.ok) return auth.response;

  const p = req.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};
  const q = cleanText(p.get("q"), 80);
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { sku: rx }];
  }
  const status = p.get("status");
  if (status) {
    if (!["draft", "published", "archived"].includes(status)) return jsonError("Invalid status filter", 400);
    filter.status = status;
  }
  const category = p.get("category");
  if (category) {
    if (!isObjectId(category)) return jsonError("Invalid category filter", 400);
    filter.categoryIds = category;
  }
  const stock = p.get("stock");
  if (stock) {
    if (stock === "in_stock") filter.stock = { $gt: LOW_STOCK_MAX };
    else if (stock === "low_stock") filter.stock = { $gte: 1, $lte: LOW_STOCK_MAX };
    else if (stock === "out_of_stock") filter.stock = 0;
    else return jsonError("Invalid stock filter", 400);
  }
  const sortKey = p.get("sort") ?? "newest";
  if (!SORTS[sortKey]) return jsonError("Invalid sort", 400);
  const limitParam = Number(p.get("limit") ?? 20);
  if (!PAGE_SIZES.includes(limitParam)) return jsonError("Page size must be 10, 20 or 50", 400);
  const page = Math.max(1, Math.floor(Number(p.get("page") ?? 1)) || 1);

  const [total, docs] = await Promise.all([
    UnstitchedSuit.countDocuments(filter),
    UnstitchedSuit.find(filter).sort(SORTS[sortKey]).skip((page - 1) * limitParam).limit(limitParam).populate("categoryIds", "name slug active").lean(),
  ]);
  return jsonOk({
    items: docs.map((d) => serializeAdminSuit(d as never)),
    total,
    page,
    limit: limitParam,
    pages: Math.max(1, Math.ceil(total / limitParam)),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "products");
  if (!auth.ok) return auth.response;
  try {
    const body = await readJsonBody(req);
    const parsed = parseSuitInput(body, { isCreate: true });
    if (!parsed.ok) return jsonError(parsed.message, 400);
    const data = parsed.data;

    // Setting an initial stock above zero is a stock change, so it needs the stock permission too.
    if ((data.stock ?? 0) > 0 && !auth.user.permissions.stock) return jsonError("Forbidden: you cannot set stock quantities", 403);

    if (data.categoryIds?.length) {
      const found = await SuitCategory.countDocuments({ _id: { $in: data.categoryIds } });
      if (found !== data.categoryIds.length) return jsonError("One or more categories do not exist.", 400);
    }

    const sku = await nextSku(); // after validation, so SKUs are not consumed by obviously bad requests
    const suit = await UnstitchedSuit.create({
      sku,
      name: data.name,
      description: data.description ?? "",
      details: data.details ?? "",
      fabric: data.fabric ?? "",
      color: data.color ?? "",
      originalPricePaise: data.originalPricePaise,
      salePricePaise: data.salePricePaise,
      stock: data.stock ?? 0,
      categoryIds: data.categoryIds ?? [],
      fabricImages: data.fabricImages ?? [],
      referenceImages: data.referenceImages ?? [],
      featured: data.featured ?? false,
      status: data.status ?? "draft",
    });
    if (suit.stock > 0) {
      await StockMovement.create({ suitId: suit._id, sku: suit.sku, previousQty: 0, change: suit.stock, resultingQty: suit.stock, reason: "initial", note: "Initial stock", actorId: auth.user.id, actorEmail: auth.user.email });
    }
    await logAudit(auth.user, "suit.created", { type: "suit", id: String(suit._id) }, `${suit.sku} ${suit.name}`, { status: suit.status });
    return jsonOk(serializeAdminSuit(suit.toObject() as never), { status: 201 });
  } catch (error) {
    if (error instanceof BadRequestError) return jsonError(error.message, 400);
    if ((error as { name?: string })?.name === "ValidationError") return jsonError((error as Error).message, 400);
    console.error("[API /admin/suits POST]", error instanceof Error ? error.message : error);
    return jsonError("Could not create suit", 500);
  }
}
