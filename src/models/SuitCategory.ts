import mongoose, { Schema } from "mongoose";

const suitCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, immutable: true },
    description: { type: String, default: "", maxlength: 500 },
    active: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
suitCategorySchema.index({ active: 1, displayOrder: 1, name: 1 });

export default mongoose.models.SuitCategory || mongoose.model("SuitCategory", suitCategorySchema);
