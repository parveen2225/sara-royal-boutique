import type { NextRequest } from "next/server";
import { getTokenFromRequest, verifyAdminToken } from "@/lib/auth/session";
import { jsonError } from "@/lib/api/utils";
import type { NextResponse } from "next/server";

type GuardResult =
  | { ok: true; payload: ReturnType<typeof verifyAdminToken> }
  | { ok: false; response: NextResponse };

export const requireAdmin = (request: NextRequest): GuardResult => {
  const token = getTokenFromRequest(request);
  if (!token) {
    return { ok: false, response: jsonError("Unauthorized", 401) };
  }
  const payload = verifyAdminToken(token);
  if (!payload || payload.role !== "admin") {
    return { ok: false, response: jsonError("Unauthorized", 401) };
  }
  return { ok: true, payload };
};
