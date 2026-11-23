import test from "node:test";
import assert from "node:assert/strict";
import { toCsv, safeText, maskPhone } from "../src/lib/csv.ts";
import { parseYmd, istRangeFromDates, istPresetRange, istDayStart, istParts, ymdIst } from "../src/lib/dates.ts";

test("csv: quoting, CRLF, BOM and formula-injection protection", () => {
  const out = toCsv(["Name", "Note", "Amount"], [["Anita, S.", 'He said "hi"', 1499.5], ["=HYPERLINK(\"http://evil\")", "+1+1", 0], ["-5 off", "@SUM(A1)", null], ["multi\nline", "ok", 3]]);
  assert.ok(out.startsWith("﻿Name,Note,Amount\r\n"));
  assert.ok(out.includes('"Anita, S.","He said ""hi""",1499.5\r\n'));
  assert.ok(out.includes("'=HYPERLINK"));
  assert.ok(out.includes("'+1+1") && out.includes("'-5 off") && out.includes("'@SUM(A1)"));
  assert.ok(out.includes('"multi\nline"'));
  assert.ok(out.endsWith("\r\n"));
  assert.equal(safeText("normal"), "normal");
  assert.equal(safeText("\t=x"), "'\t=x");
});

test("phone masking keeps only the last 4 digits", () => {
  assert.equal(maskPhone("919876543210"), "XXXXXXXX3210");
  assert.equal(maskPhone("123"), "XXXX");
});

test("IST date helpers: real calendar dates, day boundaries, ranges", () => {
  assert.deepEqual(parseYmd("2026-02-28"), { y: 2026, m: 2, d: 28 });
  for (const bad of ["2026-02-30", "2026-13-01", "2026-1-1", "26-01-01", "", null, 5, "2026-04-31"]) assert.equal(parseYmd(bad), null, String(bad));
  assert.equal(istDayStart(2026, 5, 2).toISOString(), "2026-05-01T18:30:00.000Z"); // 00:00 IST
  assert.equal(ymdIst(new Date("2026-05-01T18:29:59Z")), "2026-05-01");
  assert.equal(ymdIst(new Date("2026-05-01T18:30:00Z")), "2026-05-02"); // crosses into the next IST day
  const r = istRangeFromDates("2026-05-01", "2026-05-31");
  assert.equal(r.from.toISOString(), "2026-04-30T18:30:00.000Z");
  assert.equal(r.to.toISOString(), "2026-05-31T18:30:00.000Z"); // exclusive end = start of Jun 1 IST
  assert.equal(istRangeFromDates("2026-05-02", "2026-05-01"), null);
  assert.equal(istRangeFromDates("2025-01-01", "2026-05-01"), null); // > 366 days
  assert.ok(istRangeFromDates("2026-01-01", "2026-12-31")); // 365 days ok
  const now = new Date("2026-05-10T20:00:00Z"); // = 01:30 IST on May 11
  assert.deepEqual(istParts(now), { y: 2026, m: 5, d: 11 });
  const today = istPresetRange("today", now);
  assert.equal(ymdIst(today.from), "2026-05-11");
  assert.equal(today.to.getTime() - today.from.getTime(), 86400000);
  assert.equal(ymdIst(istPresetRange("7d", now).from), "2026-05-05");
  assert.equal(ymdIst(istPresetRange("30d", now).from), "2026-04-12");
});
