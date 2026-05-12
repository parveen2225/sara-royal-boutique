import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, unique: true, trim: true },
    serviceId: { type: String, required: true, trim: true, index: true },
  },
  { timestamps: true },
);

export default mongoose.models.Collection || mongoose.model("Collection", collectionSchema);
