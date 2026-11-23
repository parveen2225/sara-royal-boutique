import mongoose, { Schema } from "mongoose";

const historySchema = new Schema({ at: { type: Date, default: Date.now }, action: String, byId: String, byEmail: String, note: { type: String, default: "" } }, { _id: false });

// Refunds are manual (UPI / bank transfer). Staff can only RECOMMEND; approval and completion are separate Owner-only
// actions. `reserved` marks money counted against the order's refund cap (order.refundCommittedPaise).
const refundSchema = new Schema(
  {
    refundId: { type: String, required: true, unique: true, immutable: true },
    orderRef: { type: Schema.Types.ObjectId, ref: "SuitOrder", required: true, index: true },
    orderId: { type: String, required: true },
    returnRef: { type: Schema.Types.ObjectId, ref: "SuitReturn" },
    returnId: { type: String, default: "" },
    amountPaise: { type: Number, required: true, min: 1, validate: Number.isInteger }, // proposed, then the authorised amount
    method: { type: String, enum: ["upi", "bank_transfer"], required: true },
    approval: {
      status: { type: String, enum: ["recommended", "approved", "rejected"], default: "recommended" },
      byId: String, byEmail: String, at: Date, note: { type: String, default: "" },
    },
    status: { type: String, enum: ["pending", "processing", "completed", "failed"], default: "pending" },
    utr: { type: String, default: "", maxlength: 60 },
    refundDate: { type: Date },
    notes: { type: String, default: "", maxlength: 1000 },
    reserved: { type: Boolean, default: false },
    history: { type: [historySchema], default: [] },
    recommendedById: String,
    recommendedByEmail: String,
  },
  { timestamps: true },
);
refundSchema.index({ createdAt: -1 });
refundSchema.index({ status: 1, createdAt: -1 });
refundSchema.index({ refundDate: 1 });

export default mongoose.models.SuitRefund || mongoose.model("SuitRefund", refundSchema);
