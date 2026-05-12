import { randomUUID } from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { jsonError, jsonOk } from "@/lib/api/utils";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const formData = await req.formData();
    const files = formData.getAll("files").filter((f) => f instanceof File);
    if (files.length === 0) return jsonError("No files uploaded", 400);

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const urls: string[] = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return jsonError("Only JPG, PNG, WEBP, GIF images are allowed", 400);
      }
      if (file.size > MAX_FILE_SIZE) {
        return jsonError("Image size should be up to 5MB", 400);
      }
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
      const filename = `${Date.now()}-${randomUUID()}.${ext}`;
      const absoluteFilePath = path.join(uploadDir, filename);
      const bytes = await file.arrayBuffer();
      await writeFile(absoluteFilePath, Buffer.from(bytes));
      urls.push(`/uploads/${filename}`);
    }

    return jsonOk({ urls, url: urls[0] || "" });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Upload failed");
  }
}
