// Pure date helpers. The boutique operates in India, so "today", "last 7 days" and custom ranges use IST (UTC+05:30,
// no DST) day boundaries, regardless of the server's time zone.

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse "YYYY-MM-DD" (a real calendar date) -> {y,m,d}, else null. */
export function parseYmd(value: unknown): { y: number; m: number; d: number } | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d ? { y, m, d } : null;
}

/** Start (00:00 IST) of an IST calendar day as a UTC Date. */
export const istDayStart = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS);

/** The IST calendar date (y, m, d) that a UTC instant falls on. */
export function istParts(instant: Date) {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MS);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() + 1, d: shifted.getUTCDate() };
}

export const istYear = (instant = new Date()) => istParts(instant).y;

export type DateRange = { from: Date; to: Date }; // from inclusive, to EXCLUSIVE

/** Inclusive "YYYY-MM-DD".."YYYY-MM-DD" in IST -> [from, to) instants. Max 366 days. */
export function istRangeFromDates(fromYmd: unknown, toYmd: unknown): DateRange | null {
  const a = parseYmd(fromYmd), b = parseYmd(toYmd);
  if (!a || !b) return null;
  const from = istDayStart(a.y, a.m, a.d);
  const to = new Date(istDayStart(b.y, b.m, b.d).getTime() + DAY_MS);
  if (to <= from || to.getTime() - from.getTime() > 366 * DAY_MS) return null;
  return { from, to };
}

/** Preset ranges relative to `now`: today, 7d (today + previous 6 days), 30d. */
export function istPresetRange(preset: "today" | "7d" | "30d", now = new Date()): DateRange {
  const t = istParts(now);
  const todayStart = istDayStart(t.y, t.m, t.d);
  const days = preset === "today" ? 1 : preset === "7d" ? 7 : 30;
  return { from: new Date(todayStart.getTime() - (days - 1) * DAY_MS), to: new Date(todayStart.getTime() + DAY_MS) };
}

export const ymdIst = (instant: Date) => {
  const p = istParts(instant);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
};
