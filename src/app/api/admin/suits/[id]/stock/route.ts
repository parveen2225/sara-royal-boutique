import type { NextRequest } from "next/server";
import UnstitchedSuit from "@/models/UnstitchedSuit";
import StockMovement from "@/models/StockMovement";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requirePermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { BadRequestError, cleanText, isObjectId, readJsonBody } from "@/lib/validation";
import { MAX_STOCK, stockState } from "@/lib/suitInput";
import { atomically } from "@/lib/atomic";
import { findVariant, hasVariants, stockIncOp, trackedQty } from "@/lib/variantStock";

type Ctx = { params: Promise<{ id: string }> };
const MANUAL_REASONS = ["restock", "damaged", "correction", "other"] as const;

// Movement history for one suit (newest first).
export async function GET(req: NextRequest, { params }: Ctx) {
  const auth = await requirePermission(req, "stock");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Suit not found", 404);
  const rows = await StockMovement.find({ suitId: id }).sort({ createdAt: -1, _id: -1 }).limit(50).lean();
  return jsonOk(rows.map((r) => ({ id: String(r._id), sku: r.sku, variantId: r.variantId ? String(r.variantId) : null, previousQty: r.previousQty, change: r.change, resultingQty: r.resultingQty, reason: r.reason, note: r.note, actorEmail: r.actorEmail, createdAt: r.createdAt })));
}

/**
 * Manual stock change: { mode: "adjust", quantity: ±n } or { mode: "set", quantity: n } plus a reason.
 * For a suit with image variants, `variantId` says which variant; its quantity and the suit's total change together.
 * Each change is one atomic conditional update (stock can never go below zero, even with concurrent requests)
 * together with an immutable StockMovement row (previous / change / resulting quantities), committed as one unit.
 * The suit's published/draft status is never touched here.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await requirePermission(req, "stock");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Suit not found", 404);
  try {
    const body = await readJsonBody(req);
    const { mode, quantity } = body;
    const reason = body.reason;
    const note = cleanText(body.note, 500);
    if (mode !== "set" && mode !== "adjust") return jsonError("Mode must be 'set' or 'adjust'.", 400);
    if (typeof quantity !== "number" || !Number.isInteger(quantity)) return jsonError("Quantity must be a whole number.", 400);
    if (typeof reason !== "string" || !(MANUAL_REASONS as readonly string[]).includes(reason)) return jsonError("Reason must be restock, damaged, correction or other.", 400);
    if (reason === "other" && note.length < 3) return jsonError("Please describe the reason in the note.", 400);
    if (mode === "set" && (quantity < 0 || quantity > MAX_STOCK)) return jsonError(`Stock must be between 0 and ${MAX_STOCK}.`, 400);
    if (mode === "adjust" && (quantity === 0 || Math.abs(quantity) > MAX_STOCK)) return jsonError(`Adjustment must be a non-zero whole number up to ${MAX_STOCK}.`, 400);
    const variantId = body.variantId === undefined || body.variantId === null || body.variantId === "" ? null : body.variantId;
    if (variantId !== null && !isObjectId(variantId)) return jsonError("Variant not found.", 400);
    const target = await UnstitchedSuit.findById(id).select("sku stock variants").lean();
    if (!target) return jsonError("Suit not found", 404);
    if (hasVariants(target) && !variantId) return jsonError("Choose which variant's stock to change.", 400);
    if (variantId && !findVariant(target, variantId)) return jsonError(hasVariants(target) ? "That variant no longer exists. Reload and try again." : "This suit has no variants.", 400);

    // The quantity change and its StockMovement row are one unit (transaction on Atlas, compensating undo on a standalone
    // mongod): stock is never changed without its audit row, so a failed request can be retried without double-applying.
    const outcome = await atomically(async ({ session, onUndo }) => {
      let previousQty: number;
      let resultingQty: number;
      let sku: string;
      let total: number;
      if (mode === "adjust") {
        const op = stockIncOp(id, variantId, quantity, MAX_STOCK);
        const after = await UnstitchedSuit.findOneAndUpdate(op.filter, op.update, { ...op.options, returnDocument: "after", session }).lean();
        if (!after) {
          const exists = await UnstitchedSuit.exists({ _id: id }).session(session);
          return { error: exists ? jsonError("Not enough stock for that adjustment.", 409) : jsonError("Suit not found", 404) };
        }
        const undo = stockIncOp(id, variantId, -quantity);
        onUndo(async () => { await UnstitchedSuit.updateOne({ _id: id }, undo.update, undo.options); });
        resultingQty = trackedQty(after, variantId);
        previousQty = resultingQty - quantity;
        sku = findVariant(after, variantId)?.code ?? after.sku;
        total = after.stock;
      } else {
        const before = await UnstitchedSuit.findOne({ _id: id }).select("stock sku variants").session(session).lean();
        if (!before) return { error: jsonError("Suit not found", 404) };
        const current = trackedQty(before, variantId);
        if (current === quantity) return { error: jsonError("Stock is already that quantity.", 400) };
        // conditional on the quantity just read, so a concurrent order is never silently overwritten; a variant's change
        // is applied as the difference so the suit's total moves by exactly the same amount
        const diff = quantity - current;
        const op = stockIncOp(id, variantId, diff);
        const filter = variantId ? { _id: id, variants: { $elemMatch: { _id: (op.filter.variants as { $elemMatch: { _id: unknown } }).$elemMatch._id, stock: current } } } : { ...op.filter, stock: current };
        const set = await UnstitchedSuit.updateOne(filter, op.update, { ...op.options, session: session ?? undefined });
        if (set.modifiedCount !== 1) return { error: jsonError("Stock changed meanwhile. Please try again.", 409) };
        const undo = stockIncOp(id, variantId, -diff);
        onUndo(async () => { await UnstitchedSuit.updateOne({ _id: id }, undo.update, undo.options); });
        previousQty = current;
        resultingQty = quantity;
        sku = findVariant(before, variantId)?.code ?? before.sku;
        total = before.stock + diff;
      }
      const change = resultingQty - previousQty;
      await StockMovement.create([{ suitId: id, sku, ...(variantId ? { variantId } : {}), previousQty, change, resultingQty, reason, note, actorId: auth.user.id, actorEmail: auth.user.email }], { session });
      return { previousQty, resultingQty, change, sku, total };
    });
    if ("error" in outcome) return outcome.error;
    const { previousQty, resultingQty, change, total } = outcome;

    await logAudit(auth.user, "suit.stock_changed", { type: "suit", id }, `${variantId ? `${outcome.sku}: ` : ""}${previousQty} → ${resultingQty} (${reason})`, { change, ...(variantId ? { variantId } : {}) });
    // `stock` is the changed quantity (the variant's, for a variant); `totalStock` is the suit's total afterwards.
    return jsonOk({ id, variantId, previousQty, change, stock: resultingQty, stockState: stockState(resultingQty), totalStock: total, totalStockState: stockState(total) });
  } catch (error) {
    if (error instanceof BadRequestError) return jsonError(error.message, 400);
    console.error("[API /admin/suits/:id/stock]", error instanceof Error ? error.message : error);
    return jsonError("Could not change stock", 500);
  }
}
