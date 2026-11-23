import connectMongo from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";
import type { AuthUser } from "@/lib/auth/permissions";

export async function logAudit(
  actor: Pick<AuthUser, "id" | "email" | "role">,
  action: string,
  entity: { type?: string; id?: string } = {},
  summary = "",
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await connectMongo();
    await AuditLog.create({ actorId: actor.id, actorEmail: actor.email, actorRole: actor.role, action, entityType: entity.type ?? "", entityId: entity.id ?? "", summary, meta });
  } catch (error) {
    console.error("[audit] failed to write audit log", action, error instanceof Error ? error.message : error);
  }
}
