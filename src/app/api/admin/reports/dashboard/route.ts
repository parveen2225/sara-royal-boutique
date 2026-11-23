import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requirePermission } from "@/lib/auth/permissions";
import { parseRange } from "@/lib/reportRange";
import { inventorySummary, REPORT_DEFINITIONS, salesSummary } from "@/lib/reports";
import { ymdIst } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "reports");
  if (!auth.ok) return auth.response;
  const parsed = parseRange(req.nextUrl.searchParams);
  if ("error" in parsed) return jsonError(parsed.error, 400);
  const [inventory, summary] = await Promise.all([inventorySummary(), salesSummary(parsed.range)]);
  return jsonOk({
    range: { from: ymdIst(parsed.range.from), to: ymdIst(new Date(parsed.range.to.getTime() - 1)), label: parsed.label },
    inventory,
    ...summary,
    definitions: REPORT_DEFINITIONS,
  });
}
