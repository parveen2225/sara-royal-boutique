import mongoose, { type InferSchemaType, type Model, Types } from "mongoose";

const designSubcategorySchema = new mongoose.Schema(
  {
    categoryId: { type: Types.ObjectId, ref: "DesignCategory", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: "", trim: true },
    image: { type: String, default: "", trim: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

designSubcategorySchema.index({ categoryId: 1, slug: 1 }, { unique: true });
designSubcategorySchema.index({ displayOrder: 1, createdAt: -1 });

export type DesignSubcategoryDocument = InferSchemaType<typeof designSubcategorySchema>;

const DesignSubcategory: Model<DesignSubcategoryDocument> =
  mongoose.models.DesignSubcategory ||
  mongoose.model<DesignSubcategoryDocument>("DesignSubcategory", designSubcategorySchema);

export default DesignSubcategory;
