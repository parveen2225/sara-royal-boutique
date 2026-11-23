import mongoose from "mongoose";

// "admin" is the legacy role value written by the original login; it is treated as "owner" everywhere
// (see lib/auth/permissions.ts), so existing accounts keep full access with no data migration.
const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "owner", "staff"], default: "owner" },
    permissions: {
      products: { type: Boolean, default: false },
      orders: { type: Boolean, default: false },
      stock: { type: Boolean, default: false },
      returns: { type: Boolean, default: false },
      reports: { type: Boolean, default: false },
    },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    // Tokens issued before this moment are rejected (set on password reset / disable), so access can be revoked at once.
    sessionsValidAfter: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.models.Admin || mongoose.model("Admin", adminSchema);
