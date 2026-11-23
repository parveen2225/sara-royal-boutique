import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { requireAnyPermission } from "@/lib/auth/permissions";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { cloudinary, ensureCloudinary, uploadFolder } from "@/lib/cloudinary";
import { MAX_FILES_PER_REQUEST, validateImageFile } from "@/lib/imageUpload";
import { rateLimit } from "@/lib/rateLimit";
import UploadedAsset from "@/models/UploadedAsset";
import { publicIdFromUrl } from "@/lib/cloudinaryUrl";

export const runtime = "nodejs";

const uploadToCloudinary = (name: string, buffer: Buffer): Promise<string> => {
  const publicIdBase = name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "image";
  // An explicit public_id makes Cloudinary ignore unique_filename, and with overwrite:false a second upload of a file
  // with the same name would silently return the FIRST image. A random suffix keeps every upload distinct.
  const publicId = `${publicIdBase}-${crypto.randomBytes(5).toString("hex")}`;
  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image", folder: uploadFolder(), overwrite: false, public_id: publicId },
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
  const auth = await requireAnyPermission(req, ["products", "returns"]);
  if (!auth.ok) return auth.response;
  if (!rateLimit(`upload:${auth.user.id}`, 60, 10 * 60 * 1000).allowed) return jsonError("Too many uploads. Please wait a few minutes.", 429);

  let files: File[];
  try {
    const formData = await req.formData();
    files = formData.getAll("files").filter((f): f is File => f instanceof File);
  } catch {
    return jsonError("Invalid upload request", 400);
  }
  if (files.length === 0) return jsonError("No files uploaded", 400);
  if (files.length > MAX_FILES_PER_REQUEST) return jsonError(`Upload at most ${MAX_FILES_PER_REQUEST} images at a time`, 400);

  // Validate everything (declared type, size and real file signature) before anything is sent to Cloudinary.
  const buffers: Buffer[] = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const problem = validateImageFile(file.type, file.size, buffer);
    if (problem) return jsonError(problem, 400);
    buffers.push(buffer);
  }

  const cloudinaryError = ensureCloudinary();
  if (cloudinaryError) {
    console.error("[API /upload] Cloudinary config missing");
    return jsonError(cloudinaryError, 503);
  }

  try {
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) urls.push(await uploadToCloudinary(files[i].name, buffers[i]));
    // Remember every upload so abandoned ones (never saved on any record) can be cleaned up later.
    await UploadedAsset.insertMany(urls.map((url) => ({ url, publicId: publicIdFromUrl(url), uploaderId: auth.user.id })), { ordered: false }).catch((e) => console.error("[API /upload] could not record upload", e?.message));
    return jsonOk({ urls, url: urls[0] || "" });
  } catch (error) {
    console.error("[API /upload] Upload failed", error instanceof Error ? error.message : error);
    return jsonError("Upload failed", 500);
  }
}
