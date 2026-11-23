import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requirePermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { BadRequestError, isObjectId, readJsonBody } from "@/lib/validation";
import { returnAction, ReturnError, serializeReturn } from "@/lib/returnService";

// Staff with the returns permission can review, receive, inspect, attach evidence and recommend. Restoring stock and
// sending an exchange additionally need the stock permission (checked in the service). Refund money is NOT here.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "returns");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Return not found", 404);
  try {
    const body = await readJsonBody(req);
    const updated = await returnAction(id, body, auth.user);
    await logAudit(auth.user, `return.${String(body.action)}`, { type: "return", id }, updated.returnId, { decision: body.decision, result: body.result, resolution: body.resolution });
    return jsonOk(serializeReturn(updated));
  } catch (error) {
    if (error instanceof BadRequestError) return jsonError(error.message, 400);
    if (error instanceof ReturnError) return jsonError(error.message, error.status);
    console.error("[API /admin/returns/:id/action]", error instanceof Error ? error.message : error);
    return jsonError("Could not update the return", 500);
  }
}
