import mongoose, { Schema } from "mongoose";

export const RETURN_REASONS = ["preference", "wrong_item", "defective"] as const;
export const RETURN_WINDOW_DAYS = 3; // standard window after the actual delivery date; admins may review exceptions

const itemSchema = new Schema(
  {
    suitId: { type: Schema.Types.ObjectId, ref: "UnstitchedSuit", required: true },
    variantId: { type: Schema.Types.ObjectId },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
    unitPricePaise: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);
const photoSchema = new Schema({ url: { type: String, required: true }, publicId: { type: String, default: "" } }, { _id: false });
const historySchema = new Schema({ at: { type: Date, default: Date.now }, action: String, byId: String, byEmail: String, note: { type: String, default: "" } }, { _id: false });
const who = { byId: String, byEmail: String, at: Date, note: { type: String, default: "" } };

const returnSchema = new Schema(
  {
    returnId: { type: String, required: true, unique: true, immutable: true },
    orderRef: { type: Schema.Types.ObjectId, ref: "SuitOrder", required: true, index: true },
    orderId: { type: String, required: true },
    type: { type: String, enum: ["return", "exchange"], default: "return" },
    reasonType: { type: String, enum: RETURN_REASONS, required: true },
    reasonNote: { type: String, default: "", maxlength: 1000 },
    unusedUncutConfirmed: { type: Boolean, default: false },
    items: { type: [itemSchema], validate: [(v: unknown[]) => v.length >= 1 && v.length <= 50, "A return needs 1 to 50 items"] },
    photos: { type: [photoSchema], default: [], validate: [(v: unknown[]) => v.length <= 10, "At most 10 photos"] },
    requestedAt: { type: Date, required: true },
    deliveredAtSnapshot: { type: Date, required: true },
    withinWindow: { type: Boolean, required: true },
    exceptionNote: { type: String, default: "", maxlength: 500 },
    returnShipping: {
      courier: { type: String, default: "", maxlength: 80 },
      trackingNumber: { type: String, default: "", maxlength: 80 },
      trackingUrl: { type: String, default: "", maxlength: 2048 },
      paidBy: { type: String, enum: ["boutique", "customer"], required: true }, // boutique for wrong/defective, customer for preference
    },
    decision: { status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }, ...who },
    receipt: { status: { type: String, enum: ["not_received", "received"], default: "not_received" }, ...who },
    inspection: { result: { type: String, enum: ["pending", "resellable", "not_resellable"], default: "pending" }, ...who },
    resolution: { type: String, enum: ["none", "refund", "exchange", "closed", "rejected"], default: "none" },
    exchange: {
      replacementSuitId: { type: Schema.Types.ObjectId, ref: "UnstitchedSuit" },
      replacementVariantId: { type: Schema.Types.ObjectId },
      sku: String,
      name: String,
      quantity: { type: Number, min: 1 },
      fulfilled: { type: Boolean, default: false },
      fulfilledAt: Date,
    },
    restocked: { type: Boolean, default: false }, // set by a conditional update: returned stock is restored at most once
    restockedAt: Date,
    history: { type: [historySchema], default: [] },
    createdById: String,
    createdByEmail: String,
  },
  { timestamps: true },
);
returnSchema.index({ createdAt: -1 });
returnSchema.index({ "decision.status": 1, createdAt: -1 });

export default mongoose.models.SuitReturn || mongoose.model("SuitReturn", returnSchema);
