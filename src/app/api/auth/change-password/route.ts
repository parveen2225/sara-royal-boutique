import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import Admin from "@/models/Admin";
import { jsonError, jsonMessage } from "@/lib/api/utils";
import { getAuthUser } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { signAdminToken } from "@/lib/auth/session";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { rateLimit } from "@/lib/rateLimit";
import { BadRequestError, readJsonBody } from "@/lib/validation";

// Lets every admin/staff member replace their own password (needed to retire the old default admin password).
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if ("error" in user) return user.error;
  if (!rateLimit(`pw:${user.id}`, 5, 15 * 60 * 1000).allowed) return jsonError("Too many attempts. Try again later.", 429);
  try {
    const body = await readJsonBody(req);
    const current = String(body.currentPassword ?? "");
    const next = String(body.newPassword ?? "");
    if (next.length < 12 || next.length > 200) return jsonError("New password must be at least 12 characters.", 400);
    if (next === current) return jsonError("New password must differ from the current one.", 400);
    const admin = await Admin.findById(user.id).select("+password");
    if (!admin || !(await bcrypt.compare(current, admin.password))) return jsonError("Current password is incorrect.", 400);
    admin.password = await bcrypt.hash(next, 12);
    admin.sessionsValidAfter = new Date(); // every other session (old cookies) is signed out
    await admin.save();
    await logAudit(user, "auth.password_changed", { type: "admin", id: user.id }, "Password changed");
    const res = jsonMessage("Password updated");
    res.cookies.set(ADMIN_COOKIE_NAME, signAdminToken({ id: user.id, email: user.email, role: user.role }), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch (error) {
    if (error instanceof BadRequestError) return jsonError(error.message, 400);
    console.error("[API /auth/change-password]", error instanceof Error ? error.message : error);
    return jsonError("Could not change password", 500);
  }
}
