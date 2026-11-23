import { istPresetRange, istRangeFromDates, ymdIst, type DateRange } from "@/lib/dates";

/** ?range=today|7d|30d (default 30d) or ?range=custom&from=YYYY-MM-DD&to=YYYY-MM-DD (IST, inclusive, max 366 days). */
export function parseRange(p: URLSearchParams, now = new Date()): { range: DateRange; label: string } | { error: string } {
  const kind = p.get("range") ?? (p.get("from") ? "custom" : "30d");
  if (kind === "today" || kind === "7d" || kind === "30d") {
    const range = istPresetRange(kind, now);
    return { range, label: `${ymdIst(range.from)} to ${ymdIst(new Date(range.to.getTime() - 1))}` };
  }
  if (kind === "custom") {
    const range = istRangeFromDates(p.get("from"), p.get("to") ?? p.get("from"));
    if (!range) return { error: "Invalid date range. Use YYYY-MM-DD dates, from ≤ to, up to 366 days." };
    return { range, label: `${p.get("from")} to ${p.get("to") ?? p.get("from")}` };
  }
  return { error: "Invalid range." };
}
