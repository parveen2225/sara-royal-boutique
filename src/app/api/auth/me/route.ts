import { jsonError, jsonOk } from "@/lib/api/utils";
import { getTokenFromRequest, verifyAdminToken } from "@/lib/auth/session";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const payload = token ? verifyAdminToken(token) : null;
  if (!payload) return jsonError("Unauthorized", 401);
  return jsonOk(payload);
}
