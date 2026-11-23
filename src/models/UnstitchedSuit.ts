import mongoose, { Schema } from "mongoose";
import Counter from "./Counter";

export const MAX_FABRIC_IMAGES = 10;
export const MAX_REFERENCE_IMAGES = 5;
export const SUIT_STATUSES = ["draft", "published", "archived"] as const;
export const SKU_COUNTER_KEY = "suit-sku";

const imageSchema = new Schema({ url: { type: String, required: true }, publicId: { type: String, default: "" } }, { _id: false });

const suitSchema = new Schema(
  {
    sku: { type: String, required: true, unique: true, immutable: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: "", maxlength: 4000 },
    details: { type: String, default: "", maxlength: 4000 },
    fabric: { type: String, default: "", trim: true, maxlength: 120 },
    color: { type: String, default: "", trim: true, maxlength: 80 },
    // Prices are integer paise. The discount percentage is derived on read (lib/money.ts), never stored.
    originalPricePaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    salePricePaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    stock: { type: Number, required: true, min: 0, default: 0, validate: Number.isInteger },
    categoryIds: [{ type: Schema.Types.ObjectId, ref: "SuitCategory" }],
    fabricImages: { type: [imageSchema], default: [], validate: [(v: unknown[]) => v.length <= MAX_FABRIC_IMAGES, `At most ${MAX_FABRIC_IMAGES} fabric images`] },
    referenceImages: { type: [imageSchema], default: [], validate: [(v: unknown[]) => v.length <= MAX_REFERENCE_IMAGES, `At most ${MAX_REFERENCE_IMAGES} reference images`] },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: SUIT_STATUSES, default: "draft" },
  },
  { timestamps: true },
);

suitSchema.pre("validate", function () {
  if (this.salePricePaise > this.originalPricePaise) this.invalidate("salePricePaise", "Sale price cannot exceed the original price.");
  if (this.status === "published" && this.fabricImages.length < 1) this.invalidate("fabricImages", "A suit needs at least one fabric image before it can be published.");
});

suitSchema.index({ status: 1, createdAt: -1 });
suitSchema.index({ status: 1, featured: 1, createdAt: -1 });
suitSchema.index({ status: 1, salePricePaise: 1 });
suitSchema.index({ categoryIds: 1, status: 1 });
suitSchema.index({ stock: 1 });

export const formatSku = (seq: number) => `SR-${String(seq).padStart(4, "0")}`;

/** Atomically reserve the next SKU. Counter only increases, so a deleted suit's SKU is never issued again. */
export async function nextSku(): Promise<string> {
  const counter = await Counter.findOneAndUpdate({ _id: SKU_COUNTER_KEY }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return formatSku(counter.seq);
}

export default mongoose.models.UnstitchedSuit || mongoose.model("UnstitchedSuit", suitSchema);
