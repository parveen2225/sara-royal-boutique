import { jsonOk } from "@/lib/api/utils";
import { getSettingsDoc, getOrderWhatsAppNumber } from "@/lib/settings";
import { isMongoConfigured } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

// Public, non-sensitive settings shared by the website and the mobile app.
export async function GET() {
  let boutiqueName = "";
  if (isMongoConfigured()) {
    try {
      boutiqueName = (await getSettingsDoc())?.boutiqueName ?? "";
    } catch {}
  }
  return jsonOk({ whatsappNumber: await getOrderWhatsAppNumber(), boutiqueName });
}
