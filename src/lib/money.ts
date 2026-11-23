// Money is stored as integer paise (₹1 = 100 paise) so no floating-point arithmetic ever touches prices.
// This file is intentionally dependency-free so it can be unit-tested directly.

export const MAX_PAISE = 1_000_000_000; // ₹1 crore, a sanity ceiling for a single suit price

/** Parse a rupee amount ("1499", "1499.5", 1499.50) into integer paise. Returns null when invalid. */
export function rupeesToPaise(value: unknown): number | null {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(text)) return null;
  const [whole, frac = ""] = text.split(".");
  const paise = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return paise <= MAX_PAISE ? paise : null;
}

export const paiseToRupees = (paise: number): number => paise / 100;

/** "1499.00" style string for display or CSV (exact, integer based). */
export function formatPaise(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(paise));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Whole-number discount percentage for display; 0 unless sale is strictly lower than original. */
export function discountPercent(originalPaise: number, salePaise: number): number {
  if (!(originalPaise > 0) || !(salePaise < originalPaise)) return 0;
  return Math.round(((originalPaise - salePaise) * 100) / originalPaise);
}

export type PricingCheck = { ok: true; originalPaise: number; salePaise: number } | { ok: false; message: string };

/** Validate an original/sale price pair coming from an API payload (rupees in, paise out). */
export function checkPricing(original: unknown, sale: unknown): PricingCheck {
  const originalPaise = rupeesToPaise(original);
  if (originalPaise === null) return { ok: false, message: "Original price must be a valid amount (max 2 decimals)." };
  const salePaise = sale === undefined || sale === null || sale === "" ? originalPaise : rupeesToPaise(sale);
  if (salePaise === null) return { ok: false, message: "Sale price must be a valid amount (max 2 decimals)." };
  if (salePaise > originalPaise) return { ok: false, message: "Sale price cannot exceed the original price." };
  return { ok: true, originalPaise, salePaise };
}

/** "₹1,49,900" / "₹1,499.50": Indian digit grouping, integer maths only. */
export function formatInrPaise(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(paise));
  const whole = String(Math.floor(abs / 100));
  const frac = abs % 100;
  const grouped = whole.length > 3 ? `${whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${whole.slice(-3)}` : whole;
  return `${sign}₹${grouped}${frac ? `.${String(frac).padStart(2, "0")}` : ""}`;
}
