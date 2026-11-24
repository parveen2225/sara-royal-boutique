import mongoose, { Schema } from "mongoose";

// Customer profile for Firebase-authenticated shoppers (website and mobile app share it).
// Identity is the Firebase UID. NO password or token is ever stored here: Firebase Authentication holds credentials.
// Not related to the Admin model / admin login in any way.
const schema = new Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, maxlength: 128 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    name: { type: String, default: "", trim: true, maxlength: 60 },
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.models.Customer || mongoose.model("Customer", schema);
