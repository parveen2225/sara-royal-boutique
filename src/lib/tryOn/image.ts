import sharp from "sharp";
import { sniffImageType } from "@/lib/imageUpload";
import { TRYON_LIMITS } from "./config";

export type NormalizedImage = { bytes: Buffer; contentType: "image/jpeg"; width: number; height: number };

export class TryOnInputError extends Error {}

/**
 * Validate a customer image (declared type, real file signature, size, decodability, minimum resolution), then
 * re-encode it: honour EXIF orientation, drop ALL metadata (GPS, device, timestamps), cap the long side and store JPEG.
 */
export async function normalizeCustomerImage(file: { type: string; size: number }, raw: Buffer, label: string, minSide: number): Promise<NormalizedImage> {
  if (!(TRYON_LIMITS.acceptedTypes as readonly string[]).includes(file.type)) throw new TryOnInputError(`${label}: please choose a JPG, PNG or WEBP image.`);
  if (!raw.length || file.size <= 0) throw new TryOnInputError(`${label}: the file is empty.`);
  if (raw.length > TRYON_LIMITS.maxInputBytes || file.size > TRYON_LIMITS.maxInputBytes) throw new TryOnInputError(`${label}: the image must be 4 MB or smaller.`);
  if (sniffImageType(raw) !== file.type) throw new TryOnInputError(`${label}: the file is not a valid ${file.type.replace("image/", "").toUpperCase()} image.`);
  let meta: sharp.Metadata;
  try {
    meta = await sharp(raw, { limitInputPixels: TRYON_LIMITS.maxInputPixels }).metadata();
  } catch {
    throw new TryOnInputError(`${label}: the image could not be read.`);
  }
  if ((meta.pages ?? 1) > 1) throw new TryOnInputError(`${label}: animated images are not supported.`);
  const oriented = (meta.orientation ?? 1) >= 5 ? { w: meta.height ?? 0, h: meta.width ?? 0 } : { w: meta.width ?? 0, h: meta.height ?? 0 };
  if (Math.min(oriented.w, oriented.h) < minSide) throw new TryOnInputError(`${label}: the photo is too small (at least ${minSide}px on the short side).`);
  return reencode(raw);
}

export async function reencode(raw: Buffer, maxSide = TRYON_LIMITS.maxOutputSide): Promise<NormalizedImage> {
  const { data, info } = await sharp(raw, { limitInputPixels: TRYON_LIMITS.maxInputPixels })
    .rotate()
    .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  return { bytes: data, contentType: "image/jpeg", width: info.width, height: info.height };
}

/** Bytes from a stored asset: lean() Mongo reads return BSON Binary (bytes in `.buffer`), documents return Buffer. */
export function storedBytes(v: unknown): Buffer {
  if (Buffer.isBuffer(v)) return v;
  const inner = (v as { buffer?: unknown } | null)?.buffer;
  if (inner instanceof Uint8Array) return Buffer.from(inner);
  if (inner instanceof ArrayBuffer) return Buffer.from(new Uint8Array(inner));
  if (v instanceof Uint8Array) return Buffer.from(v);
  throw new Error("unreadable stored image");
}
