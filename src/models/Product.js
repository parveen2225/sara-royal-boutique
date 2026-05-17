import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    stitchingPrice: { type: String, default: "", trim: true },
    categoryId: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "", trim: true },
    imageName: { type: String, trim: true },
    imageUrls: { type: [String], default: [] },
  },
  { timestamps: true },
);

const MODEL_NAME = "ProductRuntime";

// In dev hot-reload, mongoose keeps previously compiled models.
// If schema changed (e.g. Number -> String), stale model causes cast errors.
if (process.env.NODE_ENV !== "production" && mongoose.models[MODEL_NAME]) {
  delete mongoose.models[MODEL_NAME];
}

export default (
  mongoose.models[MODEL_NAME] ||
  mongoose.model(MODEL_NAME, productSchema, "products")
);
