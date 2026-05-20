import mongoose, { type InferSchemaType, type Model } from "mongoose";

const reelSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    instagramUrl: { type: String, required: true, trim: true },
    thumbnail: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type ReelDocument = InferSchemaType<typeof reelSchema>;

const Reel: Model<ReelDocument> =
  mongoose.models.Reel || mongoose.model<ReelDocument>("Reel", reelSchema);

export default Reel;
