import mongoose, { Schema } from "mongoose";

// Every image uploaded through /api/upload is recorded here so abandoned uploads (uploaded, never saved on any
// record) can be found and removed later by the cleanup job, without ever touching an image still in use.
const schema = new Schema(
  {
    url: { type: String, required: true, unique: true },
    publicId: { type: String, default: "" },
    uploaderId: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ createdAt: 1 });

export default mongoose.models.UploadedAsset || mongoose.model("UploadedAsset", schema);
