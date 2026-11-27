import type { NextRequest } from "next/server";
import UnstitchedSuit from "@/models/UnstitchedSuit";
import StockMovement from "@/models/StockMovement";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requirePermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { BadRequestError, cleanText, isObjectId, readJsonBody } from "@/lib/validation";
import { MAX_STOCK, stockState } from "@/lib/suitInput";
import { atomically } from "@/lib/atomic";

type Ctx = { params: Promise<{ id: string }> };
const MANUAL_REASONS = ["restock", "damaged", "correction", "other"] as const;

// Movement history for one suit (newest first).
export async function GET(req: NextRequest, { params }: Ctx) {
  const auth = await requirePermission(req, "stock");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Suit not found", 404);
  const rows = await StockMovement.find({ suitId: id }).sort({ createdAt: -1, _id: -1 }).limit(50).lean();
  return jsonOk(rows.map((r) => ({ id: String(r._id), previousQty: r.previousQty, change: r.change, resultingQty: r.resultingQty, reason: r.reason, note: r.note, actorEmail: r.actorEmail, createdAt: r.createdAt })));
}

/**
 * Manual stock change: { mode: "adjust", quantity: ±n } or { mode: "set", quantity: n } plus a reason.
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

    // The quantity change and its StockMovement row are one unit (transaction on Atlas, compensating undo on a standalone
    // mongod): stock is never changed without its audit row, so a failed request can be retried without double-applying.
    const outcome = await atomically(async ({ session, onUndo }) => {
      let previousQty: number;
      let resultingQty: number;
      let sku: string;
      if (mode === "adjust") {
        const after = await UnstitchedSuit.findOneAndUpdate(
          { _id: id, stock: quantity < 0 ? { $gte: -quantity } : { $lte: MAX_STOCK - quantity } },
          { $inc: { stock: quantity } },
          { returnDocument: "after", session },
        ).lean();
        if (!after) {
          const exists = await UnstitchedSuit.exists({ _id: id }).session(session);
          return { error: exists ? jsonError("Not enough stock for that adjustment.", 409) : jsonError("Suit not found", 404) };
        }
        onUndo(async () => { await UnstitchedSuit.updateOne({ _id: id }, { $inc: { stock: -quantity } }); });
        resultingQty = after.stock;
        previousQty = resultingQty - quantity;
        sku = after.sku;
      } else {
        const before = await UnstitchedSuit.findOne({ _id: id }).select("stock sku").session(session).lean();
        if (!before) return { error: jsonError("Suit not found", 404) };
        if (before.stock === quantity) return { error: jsonError("Stock is already that quantity.", 400) };
        // conditional on the quantity just read, so a concurrent order is never silently overwritten
        const set = await UnstitchedSuit.updateOne({ _id: id, stock: before.stock }, { $set: { stock: quantity } }, { session: session ?? undefined });
        if (set.modifiedCount !== 1) return { error: jsonError("Stock changed meanwhile. Please try again.", 409) };
        onUndo(async () => { await UnstitchedSuit.updateOne({ _id: id, stock: quantity }, { $set: { stock: before.stock } }); });
        previousQty = before.stock;
        resultingQty = quantity;
        sku = before.sku;
      }
      const change = resultingQty - previousQty;
      await StockMovement.create([{ suitId: id, sku, previousQty, change, resultingQty, reason, note, actorId: auth.user.id, actorEmail: auth.user.email }], { session });
      return { previousQty, resultingQty, change };
    });
    if ("error" in outcome) return outcome.error;
    const { previousQty, resultingQty, change } = outcome;

    await logAudit(auth.user, "suit.stock_changed", { type: "suit", id }, `${previousQty} → ${resultingQty} (${reason})`, { change });
    return jsonOk({ id, previousQty, change, stock: resultingQty, stockState: stockState(resultingQty) });
  } catch (error) {
    if (error instanceof BadRequestError) return jsonError(error.message, 400);
    console.error("[API /admin/suits/:id/stock]", error instanceof Error ? error.message : error);
    return jsonError("Could not change stock", 500);
  }
}
