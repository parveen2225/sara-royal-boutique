import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import Admin from "@/models/Admin";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requireOwner } from "@/lib/auth/permissions";
import { parsePermissions, serializeStaff } from "@/lib/staff";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rateLimit";
import { BadRequestError, cleanText, isEmail, readJsonBody } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireOwner(req);
  if (!auth.ok) return auth.response;
  const docs = await Admin.find().sort({ role: 1, createdAt: 1 }).lean();
  return jsonOk(docs.map((d) => serializeStaff(d)));
}

// Create a staff login. Owner only.
export async function POST(req: NextRequest) {
  const auth = await requireOwner(req);
  if (!auth.ok) return auth.response;
  if (!rateLimit(`staff-create:${auth.user.id}`, 20, 60_000).allowed) return jsonError("Too many requests", 429);
  try {
    const body = await readJsonBody(req);
    const name = cleanText(body.name, 120);
    const email = cleanText(body.email, 254).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const permissions = "permissions" in body ? parsePermissions(body.permissions) : {}; // an explicit null/array is invalid
    if (name.length < 2) return jsonError("Name is required.", 400);
    if (!isEmail(email)) return jsonError("Enter a valid email address.", 400);
    if (password.length < 12 || password.length > 200) return jsonError("Password must be at least 12 characters.", 400);
    if (!permissions) return jsonError("Permissions must be products, orders, stock, returns or reports (true/false).", 400);
    if (await Admin.exists({ email })) return jsonError("An account with this email already exists.", 409);
    const created = await Admin.create({ name, email, password: await bcrypt.hash(password, 12), role: "staff", active: true, permissions });
    await logAudit(auth.user, "staff.created", { type: "staff", id: String(created._id) }, email, { permissions });
    return jsonOk(serializeStaff(created.toObject()), { status: 201 });
  } catch (error) {
    if (error instanceof BadRequestError) return jsonError(error.message, 400);
    if ((error as { code?: number })?.code === 11000) return jsonError("An account with this email already exists.", 409);
    console.error("[API /admin/staff POST]", error instanceof Error ? error.message : error);
    return jsonError("Could not create the account", 500);
  }
}
