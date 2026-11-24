// Website client for the AI Try-On API. The access token for a job lives only in component memory.

export type TryOnStyleOption = { key: string; label: string; description: string; needsReference: boolean };
export type TryOnConfig = {
  enabled: boolean; mode: "live" | "mock" | "off"; processor?: string | null; styles: TryOnStyleOption[]; maxImageBytes: number; acceptedTypes: string[];
  minPersonSide: number; resultRetentionMinutes: number; dailyLimit: number; disclaimer: string; consentVersion: string;
};
export type TryOnJobStatus = {
  id: string; status: "queued" | "processing" | "succeeded" | "failed" | "expired"; style: string; suitName: string;
  resultUrl?: string; error?: string; errorCode?: string;
};

export class TryOnApiError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}

async function readJson(res: Response) {
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new TryOnApiError(body?.message || "Something went wrong. Please try again.", res.status);
  return body?.data;
}

export const fetchTryOnConfig = async (): Promise<TryOnConfig> => readJson(await fetch("/api/try-on/config", { cache: "no-store" }));

export async function createTryOn(input: { suitId: string; style: string; person: Blob; reference: Blob | null; consentVersion: string }) {
  const fd = new FormData();
  fd.set("suitId", input.suitId);
  fd.set("style", input.style);
  fd.set("consent", "true");
  fd.set("adult", "true");
  fd.set("consentVersion", input.consentVersion);
  fd.set("person", input.person, "photo.jpg");
  if (input.reference) fd.set("reference", input.reference, "reference.jpg");
  let res: Response;
  try {
    res = await fetch("/api/try-on", { method: "POST", body: fd });
  } catch {
    throw new TryOnApiError("Could not reach the boutique. Please check your connection.");
  }
  return (await readJson(res)) as { id: string; token: string; status: string };
}

export async function getTryOn(id: string, token: string): Promise<TryOnJobStatus> {
  return readJson(await fetch(`/api/try-on/${id}`, { headers: { "X-TryOn-Token": token }, cache: "no-store" }));
}

/** Best effort; keepalive lets it finish while the panel/page is closing. */
export function deleteTryOn(id: string, token: string) {
  return fetch(`/api/try-on/${id}`, { method: "DELETE", headers: { "X-TryOn-Token": token }, keepalive: true }).catch(() => undefined);
}

/**
 * Browser-side preparation: decode (respecting EXIF orientation), downscale to at most `maxSide` and re-encode as JPEG.
 * Re-encoding through a canvas drops all metadata (GPS, device) before anything is uploaded.
 */
export async function prepareImage(file: File, maxSide = 1600): Promise<{ blob: Blob; width: number; height: number; url: string }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => null);
  if (!bitmap) throw new TryOnApiError("This image could not be read. Please choose a JPG, PNG or WEBP photo.");
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new TryOnApiError("Your browser could not prepare this image.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new TryOnApiError("Your browser could not prepare this image.");
  return { blob, width: w, height: h, url: URL.createObjectURL(blob) };
}
