// Dependency-free request validation helpers (unit-tested in tests/).

export const cleanText = (value: unknown, max: number): string =>
  typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, max) : "";

export const isObjectId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

export const isEmail = (value: string): boolean =>
  value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

/** Only plain http(s) URLs without embedded credentials (blocks javascript:, data:, etc.). */
export function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password;
  } catch {
    return false;
  }
}

/**
 * Normalise a WhatsApp number to digits with country code (no "+", as wa.me expects).
 * A country code is required: "+91 99888 54440" or "919988854440" are accepted, a bare 10-digit number is not.
 * India (+91) numbers must have a 10-digit mobile number starting 6-9.
 */
export function normalizeWhatsAppNumber(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!/^\+?[\d\s\-()]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 11 || digits.length > 15 || digits.startsWith("0")) return null;
  if (digits.startsWith("91") && !/^91[6-9]\d{9}$/.test(digits)) return null;
  return digits;
}

/**
 * Legacy env fallback only (NEXT_PUBLIC_WHATSAPP_NUMBER). Older deployments stored the boutique number as a bare
 * 10-digit Indian mobile ("9988854440"). The boutique is in India, so such a value is read as +91. Anything else goes
 * through the strict rules above. Admin-entered numbers keep the strict rules (a country code is required there).
 */
export function normalizeLegacyWhatsAppNumber(input: unknown): string | null {
  const strict = normalizeWhatsAppNumber(input);
  if (strict || typeof input !== "string") return strict;
  const raw = input.trim();
  if (!/^[\d\s\-()]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  return /^[6-9]\d{9}$/.test(digits) ? `91${digits}` : null;
}

export const isGstin = (value: string): boolean =>
  /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value);

export class BadRequestError extends Error {}

/** Read a JSON object body with a size cap; throws BadRequestError on anything else. */
export async function readJsonBody(req: Request, maxBytes = 256 * 1024): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > maxBytes) throw new BadRequestError("Request body too large.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BadRequestError("Request body must be valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new BadRequestError("Request body must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

/** Customer phone for orders: 10-digit Indian mobile (6-9...) or a full number with country code. Returns digits with country code. */
export function normalizeCustomerPhone(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!/^\+?[\d\s\-()]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  return normalizeWhatsAppNumber(raw);
}

export const isPincode = (value: unknown): value is string => typeof value === "string" && /^[1-9]\d{5}$/.test(value);

/** Tracking links must be https (blocks javascript:, data:, http downgrade, credentials in the URL). */
export function isSafeTrackingUrl(value: unknown): value is string {
  if (!isSafeHttpUrl(value)) return false;
  return new URL(value).protocol === "https:";
}

export const isIdempotencyKey = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(value);
