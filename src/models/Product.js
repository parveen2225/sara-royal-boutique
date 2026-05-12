import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    stitchingPrice: { type: Number, default: 0, min: 0 },
    categoryId: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "", trim: true },
    imageName: { type: String, trim: true },
    imageUrls: { type: [String], default: [] },
  },
  { timestamps: true },
);

export default mongoose.models.Product || mongoose.model("Product", productSchema);
