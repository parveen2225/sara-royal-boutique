import type { NextRequest, NextResponse } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import Admin from "@/models/Admin";
import { jsonError } from "@/lib/api/utils";
import { getTokenFromRequest, verifyAdminToken } from "@/lib/auth/session";
import { isObjectId } from "@/lib/validation";

export const PERMISSION_KEYS = ["products", "orders", "stock", "returns", "reports"] as const;
export type Permission = (typeof PERMISSION_KEYS)[number];
export type Permissions = Record<Permission, boolean>;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "owner" | "staff";
  permissions: Permissions;
}

type AuthResult = { ok: true; user: AuthUser } | { ok: false; response: NextResponse };

/** "admin" is the legacy role value; it means owner. */
export const isOwnerRole = (role: unknown) => role === "owner" || role === "admin";

const allPermissions = (): Permissions => ({ products: true, orders: true, stock: true, returns: true, reports: true });

/**
 * Resolve the signed-in admin from the cookie AND the database, so a disabled account, a role change or a
 * permission change takes effect immediately instead of waiting for the 7-day token to expire.
 */
export async function getAuthUser(req: NextRequest): Promise<AuthUser | { error: NextResponse }> {
  const token = getTokenFromRequest(req);
  const payload = token ? verifyAdminToken(token) : null;
  if (!payload || !isObjectId(payload.id)) return { error: jsonError("Unauthorized", 401) };
  if (!isMongoConfigured()) return { error: jsonError("Service unavailable", 503) };
  try {
    await connectMongo();
  } catch {
    return { error: jsonError("Service unavailable", 503) };
  }
  const doc = await Admin.findById(payload.id).lean();
  if (!doc || doc.active === false) return { error: jsonError("Unauthorized", 401) };
  if (doc.sessionsValidAfter && (payload.iatMs ?? (payload.iat ?? 0) * 1000) < new Date(doc.sessionsValidAfter).getTime()) return { error: jsonError("Unauthorized", 401) };
  const owner = isOwnerRole(doc.role);
  const permissions: Permissions = owner
    ? allPermissions()
    : Object.fromEntries(PERMISSION_KEYS.map((k) => [k, Boolean(doc.permissions?.[k])])) as Permissions;
  return { id: String(doc._id), name: doc.name, email: doc.email, role: owner ? "owner" : "staff", permissions };
}

/** Owner always passes; staff need the named permission. */
export async function requirePermission(req: NextRequest, permission: Permission): Promise<AuthResult> {
  const user = await getAuthUser(req);
  if ("error" in user) return { ok: false, response: user.error };
  if (!user.permissions[permission]) return { ok: false, response: jsonError("Forbidden", 403) };
  return { ok: true, user };
}

/** Owner-only actions: staff management, settings, refund approval/completion, permanent deletion. */
export async function requireOwner(req: NextRequest): Promise<AuthResult> {
  const user = await getAuthUser(req);
  if ("error" in user) return { ok: false, response: user.error };
  if (user.role !== "owner") return { ok: false, response: jsonError("Forbidden", 403) };
  return { ok: true, user };
}

/** Passes when the account has AT LEAST ONE of the listed permissions (owners always pass). */
export async function requireAnyPermission(req: NextRequest, permissions: Permission[]): Promise<AuthResult> {
  const user = await getAuthUser(req);
  if ("error" in user) return { ok: false, response: user.error };
  if (!permissions.some((p) => user.permissions[p])) return { ok: false, response: jsonError("Forbidden", 403) };
  return { ok: true, user };
}
