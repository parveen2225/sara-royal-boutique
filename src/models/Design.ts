import mongoose, { type InferSchemaType, type Model, Types } from "mongoose";

const designSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true, lowercase: true },
    categoryId: { type: Types.ObjectId, ref: "DesignCategory", required: true, index: true },
    subcategoryId: { type: Types.ObjectId, ref: "DesignSubcategory", required: true, index: true },
    shortDescription: { type: String, default: "", trim: true },
    fullDescription: { type: String, default: "", trim: true },
    thumbnailImage: { type: String, required: true, trim: true },
    galleryImages: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    stitchingPrice: { type: String, default: "", trim: true },
    fabricRecommendation: { type: String, default: "", trim: true },
    deliveryTimeline: { type: String, default: "", trim: true },
    featured: { type: Boolean, default: false },
    trending: { type: Boolean, default: false },
    newArrival: { type: Boolean, default: false },
    bridalSpecial: { type: Boolean, default: false },
    homepageShow: { type: Boolean, default: false },
    activeStatus: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    seoTitle: { type: String, default: "", trim: true },
    seoDescription: { type: String, default: "", trim: true },
    seoKeywords: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

designSchema.index({ slug: 1 });
designSchema.index({ categoryId: 1, subcategoryId: 1, displayOrder: 1 });
designSchema.index({ featured: 1, trending: 1, activeStatus: 1 });

export type DesignDocument = InferSchemaType<typeof designSchema>;

const Design: Model<DesignDocument> =
  mongoose.models.Design || mongoose.model<DesignDocument>("Design", designSchema);

export default Design;
