import mongoose, { Schema } from "mongoose";

// One AI Try-On request. Holds NO images (those live in TryOnAsset) and no raw IP or token: only keyed hashes.
// The whole record is removed automatically after `expiresAt` (TTL index; also enforced in code).
const schema = new Schema(
  {
    status: { type: String, enum: ["queued", "processing", "succeeded", "failed", "deleted"], default: "queued", index: true },
    suitId: { type: Schema.Types.ObjectId, ref: "UnstitchedSuit", required: true },
    suitName: { type: String, default: "" },
    style: { type: String, required: true },
    provider: { type: String, required: true },
    hasReference: { type: Boolean, default: false },
    consentAt: { type: Date, required: true },
    consentVersion: { type: String, required: true },
    clientHash: { type: String, required: true }, // HMAC of the client IP (rate limits only)
    tokenHash: { type: String, required: true }, // SHA-256 of the access token handed to the customer
    attempts: { type: Number, default: 0 },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    errorCode: { type: String, default: "" },
    resultExpiresAt: { type: Date, default: null },
    testOutcome: { type: String, default: "" }, // mock-provider test hook only (never set unless TRYON_MOCK_TEST_HOOKS=true)
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
schema.index({ clientHash: 1, createdAt: -1 });
schema.index({ createdAt: -1 });

export default mongoose.models.TryOnJob || mongoose.model("TryOnJob", schema);
