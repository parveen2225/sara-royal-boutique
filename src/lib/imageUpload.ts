// Dependency-free upload validation (unit-tested). Declared MIME types are client-controlled, so the file's real
// signature ("magic bytes") must match as well.

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_FILES_PER_REQUEST = 10;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export type ImageKind = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export function sniffImageType(b: Uint8Array): ImageKind | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  const ascii = (from: number, len: number) => String.fromCharCode(...b.slice(from, from + len));
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  if (b.length >= 6 && (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a")) return "image/gif";
  return null;
}

/** Returns an error message, or null when the file is acceptable. */
export function validateImageFile(declaredType: string, size: number, bytes: Uint8Array): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(declaredType)) return "Only JPG, PNG, WEBP, GIF images are allowed";
  if (size <= 0 || bytes.length === 0) return "Uploaded file is empty";
  if (size > MAX_UPLOAD_BYTES || bytes.length > MAX_UPLOAD_BYTES) return "Image size should be up to 5MB";
  if (sniffImageType(bytes) !== declaredType) return "File content does not match its image type";
  return null;
}
