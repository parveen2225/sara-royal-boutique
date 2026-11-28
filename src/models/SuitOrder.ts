import mongoose, { Schema } from "mongoose";

export const ORDER_STATUSES = ["confirmed", "packed", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const PAYMENT_METHODS = ["cod", "upi"] as const;
export const PAYMENT_STATUSES = ["pending", "paid"] as const;

// Orders are entered by an admin AFTER the customer confirmed on WhatsApp. Everything money-related is frozen at
// creation (name, SKU, unit price, totals) so later catalogue changes never alter history.
const lineSchema = new Schema(
  {
    suitId: { type: Schema.Types.ObjectId, ref: "UnstitchedSuit", required: true },
    variantId: { type: Schema.Types.ObjectId }, // the suit variant the stock came from (sku is then its code, e.g. SR-0005-V2)
    sku: { type: String, required: true },
    name: { type: String, required: true },
    unitPricePaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
    lineTotalPaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    returnedQuantity: { type: Number, default: 0, min: 0, validate: Number.isInteger }, // reserved by non-rejected returns; never above quantity
  },
  { _id: false },
);

const historySchema = new Schema(
  { status: String, at: { type: Date, default: Date.now }, byId: String, byEmail: String, note: { type: String, default: "" } },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true, immutable: true },
    idempotencyKey: { type: String, unique: true, sparse: true },
    customer: {
      name: { type: String, required: true, trim: true, maxlength: 120 },
      phone: { type: String, required: true },
      address: { type: String, required: true, trim: true, maxlength: 500 },
      pincode: { type: String, required: true },
    },
    items: { type: [lineSchema], validate: [(v: unknown[]) => v.length >= 1 && v.length <= 50, "An order needs 1 to 50 items"] },
    subtotalPaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    deliveryChargePaise: { type: Number, required: true, min: 0, default: 0, validate: Number.isInteger },
    totalPaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "pending" },
    paidAt: { type: Date },
    status: { type: String, enum: ORDER_STATUSES, default: "confirmed" },
    courier: {
      name: { type: String, default: "", maxlength: 80 },
      trackingNumber: { type: String, default: "", maxlength: 80 },
      trackingUrl: { type: String, default: "", maxlength: 2048 },
      shippedAt: { type: Date },
    },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String, default: "", maxlength: 500 },
    notes: { type: String, default: "", maxlength: 1000 },
    // true while this order's quantities are deducted from stock. Flipped by conditional updates so a deduction or a
    // restoration can only ever happen once per order.
    stockDeducted: { type: Boolean, default: false },
    refundCommittedPaise: { type: Number, default: 0, min: 0 }, // sum of approved/processing/completed refunds (Phase 6)
    invoiceId: { type: String, default: "" },
    statusHistory: { type: [historySchema], default: [] },
    createdById: { type: String, default: "" },
    createdByEmail: { type: String, default: "" },
  },
  { timestamps: true },
);

orderSchema.pre("validate", function () {
  const sum = this.items.reduce((s: number, i: { lineTotalPaise: number }) => s + i.lineTotalPaise, 0);
  if (sum !== this.subtotalPaise) this.invalidate("subtotalPaise", "Subtotal does not match the line totals.");
  if (this.subtotalPaise + this.deliveryChargePaise !== this.totalPaise) this.invalidate("totalPaise", "Total does not match subtotal + delivery.");
});

orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ "customer.phone": 1 });
orderSchema.index({ "items.suitId": 1 });

export default mongoose.models.SuitOrder || mongoose.model("SuitOrder", orderSchema);
