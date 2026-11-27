import mongoose, { Schema } from "mongoose";

export const STOCK_REASONS = ["initial", "order_confirmed", "order_cancelled", "return_restock", "exchange", "damaged", "correction", "other", "restock"] as const;

// One immutable row per stock change: previous quantity, change, resulting quantity, who and why.
const movementSchema = new Schema(
  {
    suitId: { type: Schema.Types.ObjectId, ref: "UnstitchedSuit", required: true },
    sku: { type: String, required: true },
    previousQty: { type: Number, required: true },
    change: { type: Number, required: true },
    resultingQty: { type: Number, required: true },
    reason: { type: String, enum: STOCK_REASONS, required: true },
    note: { type: String, default: "", maxlength: 500 },
    refType: { type: String, default: "" },
    refId: { type: String, default: "" },
    actorId: { type: String, required: true },
    actorEmail: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
movementSchema.index({ suitId: 1, createdAt: -1 });
movementSchema.index({ refType: 1, refId: 1 });

export default mongoose.models.StockMovement || mongoose.model("StockMovement", movementSchema);
