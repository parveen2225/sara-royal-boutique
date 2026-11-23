import mongoose, { Schema } from "mongoose";

// Private, temporary image bytes for AI Try-On (customer photo, optional reference, generated result).
// Never exposed through a public URL: only served by /api/try-on/[id]/result with a short-lived signature.
// Inputs are deleted as soon as generation finishes; everything is removed at `expiresAt` (TTL index + code checks).
const schema = new Schema(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "TryOnJob", required: true, index: true },
    kind: { type: String, enum: ["person", "reference", "result"], required: true },
    contentType: { type: String, required: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    bytes: { type: Buffer, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.TryOnAsset || mongoose.model("TryOnAsset", schema);
