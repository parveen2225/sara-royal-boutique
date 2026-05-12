import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    icon: { type: String, default: "", trim: true },
    imageUrl: { type: String, default: "", trim: true },
    imageName: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.models.Service || mongoose.model("Service", serviceSchema);
