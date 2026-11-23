import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import SiteSettings from "@/models/SiteSettings";
import { normalizeLegacyWhatsAppNumber, normalizeWhatsAppNumber } from "@/lib/validation";

const DEFAULT_SETTINGS = {
  key: "main", whatsappNumber: "", boutiqueName: "", businessAddress: "", contactNumber: "", email: "", invoiceFooter: "",
  logo: null, gst: { enabled: false, gstin: "", legalName: "" },
};

/** Read-only: returns defaults when nothing has been saved yet. Reads never write to the database. */
export async function getSettingsDoc() {
  await connectMongo();
  return (await SiteSettings.findOne({ key: "main" }).lean()) ?? DEFAULT_SETTINGS;
}

/** WhatsApp number used for orders: the admin-managed setting, else the legacy env value (a bare 10-digit Indian mobile is read as +91), else null (clients hide ordering). */
export async function getOrderWhatsAppNumber(): Promise<string | null> {
  if (isMongoConfigured()) {
    try {
      const s = await getSettingsDoc();
      const fromDb = normalizeWhatsAppNumber(s?.whatsappNumber);
      if (fromDb) return fromDb;
    } catch (error) {
      console.error("[settings] could not read settings", error instanceof Error ? error.message : error);
    }
  }
  return normalizeLegacyWhatsAppNumber(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
}
