import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import Admin from "@/models/Admin";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { isOwnerRole, requireOwner } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { BadRequestError, cleanText, isObjectId, readJsonBody } from "@/lib/validation";
import { parsePermissions, serializeStaff } from "@/lib/staff";

// Change a STAFF account (name, permissions, active, password reset). Owner only. Owner accounts cannot be edited
// here. Disabling an account or resetting its password also signs out its existing sessions immediately.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Account not found", 404);
  try {
    const body = await readJsonBody(req);
    const target = await Admin.findById(id);
    if (!target) return jsonError("Account not found", 404);
    if (isOwnerRole(target.role)) return jsonError("Owner accounts cannot be changed here.", 403);

    const $set: Record<string, unknown> = {};
    const changes: string[] = [];
    if ("name" in body) { const n = cleanText(body.name, 120); if (n.length < 2) return jsonError("Name is required.", 400); $set.name = n; changes.push("name"); }
    if ("permissions" in body) {
      const perms = parsePermissions(body.permissions);
      if (!perms) return jsonError("Permissions must be products, orders, stock, returns or reports (true/false).", 400);
      for (const [k, v] of Object.entries(perms)) $set[`permissions.${k}`] = v;
      changes.push("permissions");
    }
    if ("active" in body) {
      if (typeof body.active !== "boolean") return jsonError("Active must be true or false.", 400);
      $set.active = body.active; changes.push(body.active ? "enabled" : "disabled");
      if (!body.active) $set.sessionsValidAfter = new Date();
    }
    if ("newPassword" in body) {
      const pw = typeof body.newPassword === "string" ? body.newPassword : "";
      if (pw.length < 12 || pw.length > 200) return jsonError("Password must be at least 12 characters.", 400);
      $set.password = await bcrypt.hash(pw, 12); $set.sessionsValidAfter = new Date(); changes.push("password_reset");
    }
    if (!Object.keys($set).length) return jsonError("Nothing to update.", 400);
    const updated = await Admin.findByIdAndUpdate(id, { $set }, { returnDocument: "after" }).lean();
    await logAudit(auth.user, changes.includes("disabled") ? "staff.disabled" : changes.includes("password_reset") ? "staff.password_reset" : "staff.updated", { type: "staff", id }, target.email, { changes, ...(body.permissions ? { permissions: body.permissions } : {}) });
    return jsonOk(serializeStaff(updated as never));
  } catch (error) {
    if (error instanceof BadRequestError) return jsonError(error.message, 400);
    console.error("[API /admin/staff/:id PUT]", error instanceof Error ? error.message : error);
    return jsonError("Could not update the account", 500);
  }
}
