import { v2 as cloudinary } from "cloudinary";
import { publicIdFromUrl } from "@/lib/cloudinaryUrl";

export { cloudinary };

let configured = false;

export const CLOUDINARY_MISSING_MESSAGE =
  "Cloudinary is not configured. Add credentials to .env.local (local) or your host env (e.g. Vercel): either CLOUDINARY_URL (from Cloudinary dashboard → API Keys → Environment variable), or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET. Restart the dev server after saving.";

export const uploadFolder = () => process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() || "sara-royal";

/** Configure the SDK from the environment. Returns an error message, or null when ready. */
export function ensureCloudinary(): string | null {
  if (configured) return null;
  const envUrl = process.env.CLOUDINARY_URL?.trim();
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  try {
    if (envUrl) {
      cloudinary.config(true);
      cloudinary.config({ secure: true });
    } else if (cloudName && apiKey && apiSecret) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    } else {
      return CLOUDINARY_MISSING_MESSAGE;
    }
  } catch {
    return "Invalid CLOUDINARY_URL. It must start with cloudinary:// (copy the full value from your Cloudinary dashboard).";
  }
  const cfg = cloudinary.config() as { cloud_name?: string; api_key?: string; api_secret?: string };
  if (!cfg.cloud_name || !cfg.api_key || !cfg.api_secret) return CLOUDINARY_MISSING_MESSAGE;
  configured = true;
  return null;
}

/**
 * Best-effort removal of images we uploaded (only ids inside our upload folder). Never throws: a failed cleanup
 * must not fail the admin action; it is logged instead.
 */
export async function deleteCloudinaryImages(urlsOrIds: { url: string; publicId?: string }[]): Promise<void> {
  if (ensureCloudinary()) return;
  const prefix = `${uploadFolder()}/`;
  const ids = [...new Set(urlsOrIds.map((i) => i.publicId || publicIdFromUrl(i.url)).filter((id) => id.startsWith(prefix)))];
  for (const id of ids) {
    try {
      await cloudinary.uploader.destroy(id, { resource_type: "image", invalidate: true });
    } catch (error) {
      console.error("[cloudinary] could not delete", id, error instanceof Error ? error.message : error);
    }
  }
}
