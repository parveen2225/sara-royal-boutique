import mongoose, { Schema } from "mongoose";

// Append-only record of sensitive actions. Never put secrets or full customer PII in `meta`.
const auditSchema = new Schema(
  {
    actorId: { type: String, required: true },
    actorEmail: { type: String, default: "" },
    actorRole: { type: String, default: "" },
    action: { type: String, required: true, index: true },
    entityType: { type: String, default: "" },
    entityId: { type: String, default: "" },
    summary: { type: String, default: "", maxlength: 500 },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
auditSchema.index({ createdAt: -1 });
auditSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export default mongoose.models.AuditLog || mongoose.model("AuditLog", auditSchema);
