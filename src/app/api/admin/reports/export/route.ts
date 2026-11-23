import type { NextRequest } from "next/server";
import { jsonError } from "@/lib/api/utils";
import { requirePermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rateLimit";
import { parseRange } from "@/lib/reportRange";
import { buildReport, REPORT_DEFINITIONS, type ReportType } from "@/lib/reports";
import { reportToCsv, reportToXlsx } from "@/lib/exporters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const TYPES: ReportType[] = ["orders", "sales", "refunds", "payments"];

// CSV / Excel exports. Needs the reports permission. Phone numbers are masked for staff (only the Owner gets full
// numbers) and delivery addresses are never exported. Every export is audit-logged.
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "reports");
  if (!auth.ok) return auth.response;
  if (!rateLimit(`export:${auth.user.id}`, 20, 60_000).allowed) return jsonError("Too many exports. Please wait a minute.", 429);
  const p = req.nextUrl.searchParams;
  const type = p.get("type") as ReportType;
  if (!TYPES.includes(type)) return jsonError("Report type must be orders, sales, refunds or payments.", 400);
  const format = p.get("format") ?? "csv";
  if (format !== "csv" && format !== "xlsx") return jsonError("Format must be csv or xlsx.", 400);
  const parsed = parseRange(p);
  if ("error" in parsed) return jsonError(parsed.error, 400);

  const report = await buildReport(type, parsed.range, { fullPhone: auth.user.role === "owner" });
  const base = `sara-suits-${type}-${parsed.label.replace(/ to /, "_to_")}`;
  await logAudit(auth.user, "report.exported", { type: "report", id: type }, `${type}.${format} ${parsed.label}`, { rows: report.rows.length });
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": `attachment; filename="${base}.${format}"` };
  if (format === "csv") return new Response(reportToCsv(report), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" } });
  const buf = await reportToXlsx(report, { rangeLabel: parsed.label, definitions: REPORT_DEFINITIONS });
  return new Response(new Uint8Array(buf), { headers: { ...headers, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } });
}
