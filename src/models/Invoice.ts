import mongoose, { Schema } from "mongoose";

// One invoice per order. Everything printed on it is copied here when the invoice is first issued (business details,
// GST settings, customer, items, prices, logo bytes), so later settings or catalogue changes never rewrite it.
const invoiceSchema = new Schema(
  {
    invoiceId: { type: String, required: true, unique: true, immutable: true },
    orderRef: { type: Schema.Types.ObjectId, ref: "SuitOrder", required: true, unique: true },
    orderId: { type: String, required: true },
    issuedAt: { type: Date, required: true, default: Date.now },
    snapshot: {
      business: { name: String, address: String, contactNumber: String, email: String, footer: String },
      gst: { enabled: { type: Boolean, default: false }, gstin: String, legalName: String },
      customer: { name: String, phone: String, address: String, pincode: String },
      items: [{ sku: String, name: String, quantity: Number, unitPricePaise: Number, lineTotalPaise: Number, _id: false }],
      subtotalPaise: Number,
      deliveryChargePaise: Number,
      totalPaise: Number,
      paymentMethod: String,
      orderDate: Date,
    },
    logo: { type: Buffer, select: false },
    logoType: { type: String, default: "" },
    issuedById: String,
    issuedByEmail: String,
  },
  { timestamps: true },
);

export default mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);
