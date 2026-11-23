import { isOwnerRole, PERMISSION_KEYS } from "@/lib/auth/permissions";

export const serializeStaff = (a: { _id: unknown; name: string; email: string; role: string; active?: boolean; permissions?: Record<string, boolean>; lastLoginAt?: Date; createdAt?: Date }) => ({
  id: String(a._id), name: a.name, email: a.email, role: isOwnerRole(a.role) ? "owner" : "staff", active: a.active !== false,
  permissions: Object.fromEntries(PERMISSION_KEYS.map((k) => [k, isOwnerRole(a.role) ? true : Boolean(a.permissions?.[k])])), lastLoginAt: a.lastLoginAt ?? null, createdAt: a.createdAt,
});

/** Strict permission object: only the five known keys, booleans only. */
export function parsePermissions(value: unknown): Record<string, boolean> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!(PERMISSION_KEYS as readonly string[]).includes(k) || typeof v !== "boolean") return null;
    out[k] = v;
  }
  return out;
}
