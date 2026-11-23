import type { NextRequest } from "next/server";
import SiteSettings from "@/models/SiteSettings";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requireOwner } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { getSettingsDoc } from "@/lib/settings";
import { unreferencedImages } from "@/lib/assetRefs";
import { deleteCloudinaryImages } from "@/lib/cloudinary";
import { BadRequestError, cleanText, isEmail, isGstin, isSafeHttpUrl, normalizeWhatsAppNumber, readJsonBody } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireOwner(req);
  if (!auth.ok) return auth.response;
  return jsonOk(await getSettingsDoc());
}

export async function PUT(req: NextRequest) {
  const auth = await requireOwner(req);
  if (!auth.ok) return auth.response;
  try {
    const body = await readJsonBody(req);
    const $set: Record<string, unknown> = {};

    if ("whatsappNumber" in body) {
      const raw = cleanText(body.whatsappNumber, 30);
      const normalized = raw ? normalizeWhatsAppNumber(raw) : "";
      if (raw && !normalized) return jsonError("WhatsApp number must include a country code, e.g. +91 98765 43210.", 400);
      $set.whatsappNumber = normalized;
    }
    if ("boutiqueName" in body) $set.boutiqueName = cleanText(body.boutiqueName, 120);
    if ("businessAddress" in body) $set.businessAddress = cleanText(body.businessAddress, 500);
    if ("contactNumber" in body) $set.contactNumber = cleanText(body.contactNumber, 30);
    if ("invoiceFooter" in body) $set.invoiceFooter = cleanText(body.invoiceFooter, 500);
    if ("email" in body) {
      const email = cleanText(body.email, 254).toLowerCase();
      if (email && !isEmail(email)) return jsonError("Email address is not valid.", 400);
      $set.email = email;
    }
    if ("logo" in body) {
      const logo = body.logo as { url?: unknown; publicId?: unknown } | null;
      if (logo === null) $set.logo = null;
      else if (logo && isSafeHttpUrl(logo.url)) $set.logo = { url: logo.url, publicId: cleanText(logo.publicId, 300) };
      else return jsonError("Logo must be an uploaded image URL.", 400);
    }
    if ("gst" in body) {
      const gst = (body.gst ?? {}) as Record<string, unknown>;
      const enabled = gst.enabled === true;
      const gstin = cleanText(gst.gstin, 15).toUpperCase();
      if (enabled && !isGstin(gstin)) return jsonError("A valid 15-character GSTIN is required to enable GST.", 400);
      $set["gst.enabled"] = enabled;
      $set["gst.gstin"] = gstin;
      $set["gst.legalName"] = cleanText(gst.legalName, 160);
    }

    if (Object.keys($set).length === 0) return jsonError("No valid settings supplied.", 400);
    const oldLogo = "logo" in $set ? ((await getSettingsDoc()) as { logo?: { url?: string; publicId?: string } | null }).logo : null;
    const updated = await SiteSettings.findOneAndUpdate({ key: "main" }, { $set, $setOnInsert: { key: "main" } }, { upsert: true, returnDocument: "after" }).lean();
    // Replaced or removed logo: delete the old file from Cloudinary only if nothing else references it. (Issued invoices
    // keep their own copy of the logo bytes, so they are not affected.)
    const newUrl = (updated as { logo?: { url?: string } | null } | null)?.logo?.url;
    if (oldLogo?.url && oldLogo.url !== newUrl) await deleteCloudinaryImages(await unreferencedImages([{ url: oldLogo.url, publicId: oldLogo.publicId }]));
    await logAudit(auth.user, "settings.updated", { type: "settings", id: "main" }, "Settings updated", { fields: Object.keys($set) });
    return jsonOk(updated);
  } catch (error) {
    if (error instanceof BadRequestError) return jsonError(error.message, 400);
    console.error("[API /admin/settings PUT]", error instanceof Error ? error.message : error);
    return jsonError("Could not save settings", 500);
  }
}
