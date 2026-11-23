import mongoose, { Schema } from "mongoose";

// Singleton document (key "main"): order WhatsApp number, invoice branding, optional GST. GST is OFF by default
// and no tax rate is ever assumed here.
const settingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    whatsappNumber: { type: String, default: "" },
    boutiqueName: { type: String, default: "", maxlength: 120 },
    businessAddress: { type: String, default: "", maxlength: 500 },
    contactNumber: { type: String, default: "", maxlength: 30 },
    email: { type: String, default: "", maxlength: 254 },
    invoiceFooter: { type: String, default: "", maxlength: 500 },
    logo: { type: new Schema({ url: String, publicId: String }, { _id: false }), default: null },
    gst: {
      enabled: { type: Boolean, default: false },
      gstin: { type: String, default: "" },
      legalName: { type: String, default: "", maxlength: 160 },
    },
  },
  { timestamps: true },
);

export default mongoose.models.SiteSettings || mongoose.model("SiteSettings", settingsSchema);
