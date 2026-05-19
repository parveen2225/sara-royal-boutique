import mongoose from "mongoose";

const heroBannerSchema = new mongoose.Schema(
  {
    title: { type: String, default: "", trim: true },
    subtitle: { type: String, default: "", trim: true },
    image: { type: String, required: true, trim: true },
    buttonText: { type: String, default: "", trim: true },
    buttonLink: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.models.HeroBanner ||
  mongoose.model("HeroBanner", heroBannerSchema);
