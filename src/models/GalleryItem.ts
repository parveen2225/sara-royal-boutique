import mongoose, { type InferSchemaType, type Model } from "mongoose";

export const GALLERY_CATEGORIES = [
  "Bridal",
  "Anarkali",
  "Party Wear",
  "Kurti",
  "Plazo",
] as const;

const galleryItemSchema = new mongoose.Schema(
  {
    title: { type: String, default: "", trim: true },
    image: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: GALLERY_CATEGORIES,
      trim: true,
    },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type GalleryItemDocument = InferSchemaType<typeof galleryItemSchema>;

const GalleryItem: Model<GalleryItemDocument> =
  mongoose.models.GalleryItem ||
  mongoose.model<GalleryItemDocument>("GalleryItem", galleryItemSchema);

export default GalleryItem;
