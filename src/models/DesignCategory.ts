import mongoose, { type InferSchemaType, type Model } from "mongoose";

const designCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true, lowercase: true },
    description: { type: String, default: "", trim: true },
    image: { type: String, default: "", trim: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

designCategorySchema.index({ slug: 1 });
designCategorySchema.index({ displayOrder: 1, createdAt: -1 });

export type DesignCategoryDocument = InferSchemaType<typeof designCategorySchema>;

const DesignCategory: Model<DesignCategoryDocument> =
  mongoose.models.DesignCategory ||
  mongoose.model<DesignCategoryDocument>("DesignCategory", designCategorySchema);

export default DesignCategory;
