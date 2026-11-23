import type { NextRequest } from "next/server";
import { getTokenFromRequest, verifyAdminToken } from "@/lib/auth/session";
import { isOwnerRole } from "@/lib/auth/permissions";
import { jsonError } from "@/lib/api/utils";
import type { NextResponse } from "next/server";

type GuardResult =
  | { ok: true; payload: ReturnType<typeof verifyAdminToken> }
  | { ok: false; response: NextResponse };

/**
 * Legacy guard for the original admin routes (products, services, gallery, ...). Owner-level only:
 * staff accounts are rejected here and use requirePermission() on the suit/order routes instead.
 */
export const requireAdmin = (request: NextRequest): GuardResult => {
  const token = getTokenFromRequest(request);
  if (!token) {
    return { ok: false, response: jsonError("Unauthorized", 401) };
  }
  const payload = verifyAdminToken(token);
  if (!payload || !isOwnerRole(payload.role)) {
    return { ok: false, response: jsonError("Unauthorized", 401) };
  }
  return { ok: true, payload };
};
