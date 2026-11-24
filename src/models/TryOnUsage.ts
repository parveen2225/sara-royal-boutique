import mongoose, { Schema } from "mongoose";

// AI Try-On usage counters (cost and abuse caps). No images, no IPs: `_id` is a period key such as
// "day:2026-11-23", "month:gemini:2026-11" or "client:<keyed hash>:2026-11-23". Counters are reserved with a single
// conditional $inc, so concurrent requests can never push a counter past its limit. Removed after `expiresAt`.
const schema = new Schema(
  {
    _id: { type: String, required: true },
    count: { type: Number, required: true, default: 0, min: 0 },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.TryOnUsage || mongoose.model("TryOnUsage", schema);
