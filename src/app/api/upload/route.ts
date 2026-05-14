import { v2 as cloudinary } from "cloudinary";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { jsonError, jsonOk } from "@/lib/api/utils";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const DEFAULT_FOLDER = "sara-royal";

export const runtime = "nodejs";

let cloudinaryConfigured = false;

const missingCloudinaryMessage =
  "Cloudinary is not configured. Add credentials to .env.local (local) or your host env (e.g. Vercel): either CLOUDINARY_URL (from Cloudinary dashboard → API Keys → Environment variable), or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET. Restart the dev server after saving.";

const ensureCloudinary = (): string | null => {
  if (cloudinaryConfigured) return null;

  const envUrl = process.env.CLOUDINARY_URL?.trim();
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  try {
    if (envUrl) {
      // SDK loads cloud_name / api_key / api_secret from CLOUDINARY_URL
      cloudinary.config(true);
      cloudinary.config({ secure: true });
    } else if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    } else {
      return missingCloudinaryMessage;
    }
  } catch {
    return "Invalid CLOUDINARY_URL. It must start with cloudinary:// (copy the full value from your Cloudinary dashboard).";
  }

  const cfg = cloudinary.config() as { cloud_name?: string; api_key?: string; api_secret?: string };
  if (!cfg.cloud_name || !cfg.api_key || !cfg.api_secret) {
    return missingCloudinaryMessage;
  }

  cloudinaryConfigured = true;
  return null;
};

const uploadToCloudinary = async (file: File): Promise<string> => {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() || DEFAULT_FOLDER;
  const publicIdBase = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-");

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        public_id: publicIdBase || undefined,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url) return reject(new Error("Cloudinary did not return secure_url"));
        return resolve(result.secure_url);
      },
    );

    stream.end(buffer);
  });
};

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const cloudinaryError = ensureCloudinary();
  if (cloudinaryError) {
    console.error("[API /upload] Cloudinary config missing");
    return jsonError(cloudinaryError, 503);
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll("files").filter((f) => f instanceof File);
    if (files.length === 0) return jsonError("No files uploaded", 400);

    const urls: string[] = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return jsonError("Only JPG, PNG, WEBP, GIF images are allowed", 400);
      }
      if (file.size > MAX_FILE_SIZE) {
        return jsonError("Image size should be up to 5MB", 400);
      }
      const secureUrl = await uploadToCloudinary(file);
      urls.push(secureUrl);
    }

    return jsonOk({ urls, url: urls[0] || "" });
  } catch (error) {
    console.error("[API /upload] Upload failed", error);
    return jsonError(error instanceof Error ? error.message : "Upload failed");
  }
}
