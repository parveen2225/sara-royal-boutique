// Pure CSV helpers (unit-tested).

export type Cell = string | number | boolean | null | undefined | Date;

/** Neutralise spreadsheet formula injection: a cell that starts with = + - @ tab or CR is prefixed with an apostrophe. */
export function safeText(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function cellToCsv(value: Cell, isText: boolean): string {
  if (value === null || value === undefined) return "";
  let s: string;
  if (value instanceof Date) s = value.toISOString();
  else if (typeof value === "number") s = Number.isFinite(value) ? String(value) : "";
  else s = String(value);
  if (isText && typeof value === "string") s = safeText(s);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** UTF-8 with BOM (so Excel opens it correctly), CRLF line endings, quotes doubled, formulas neutralised. */
export function toCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers.map((h) => cellToCsv(h, true)).join(",")];
  for (const r of rows) lines.push(r.map((c) => cellToCsv(c, true)).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** Keep only the last 4 digits of a phone number: "XXXXXXXX3210". */
export const maskPhone = (digits: string) => (digits.length <= 4 ? "XXXX" : `${"X".repeat(digits.length - 4)}${digits.slice(-4)}`);
