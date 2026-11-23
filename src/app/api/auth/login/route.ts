import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import Admin from "@/models/Admin";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { jsonError, jsonMessage } from "@/lib/api/utils";
import { signAdminToken } from "@/lib/auth/session";
import { isOwnerRole } from "@/lib/auth/permissions";
import { clientIp, rateLimit, resetRateLimit } from "@/lib/rateLimit";
import { isEmail } from "@/lib/validation";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

// Compared against when the email is unknown so response time does not reveal which emails exist.
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8.4t3yS8Zr1b5C7p8pXf0yQmV0m2eK";

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return jsonError("Invalid request", 400);
    }
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password || password.length > 200 || !isEmail(email)) {
      return jsonError("Email and password are required", 400);
    }

    // Two limits: per IP+email, and per email alone (so rotating or spoofing X-Forwarded-For cannot brute-force one account).
    const emailKey = `login-email:${email}`;
    const emailLimit = rateLimit(emailKey, 30, 15 * 60 * 1000);
    if (!emailLimit.allowed) {
      const res = jsonError("Too many login attempts. Please try again later.", 429);
      res.headers.set("Retry-After", String(emailLimit.retryAfterSec));
      return res;
    }
    const limitKey = `login:${clientIp(req.headers)}:${email}`;
    const limit = rateLimit(limitKey, 8, 15 * 60 * 1000);
    if (!limit.allowed) {
      const res = jsonError("Too many login attempts. Please try again later.", 429);
      res.headers.set("Retry-After", String(limit.retryAfterSec));
      return res;
    }

    if (!isMongoConfigured()) return jsonError("Service unavailable", 503);
    try {
      await connectMongo();
    } catch {
      return jsonError("Service unavailable", 503);
    }

    // First-run bootstrap: only when NO admin exists yet and both env vars are set (never a hardcoded password).
    const bootEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
    const bootPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "";
    if (bootEmail && bootPassword.length >= 12 && email === bootEmail && password === bootPassword && (await Admin.estimatedDocumentCount()) === 0) {
      await Admin.create({ name: "Owner", email: bootEmail, password: await bcrypt.hash(bootPassword, 12), role: "owner" });
    }

    const admin = await Admin.findOne({ email }).select("+password");
    const validPassword = await bcrypt.compare(password, admin?.password ?? DUMMY_HASH);
    if (!admin || !validPassword || admin.active === false) {
      return jsonError("Invalid email or password", 401);
    }

    resetRateLimit(limitKey);
    resetRateLimit(emailKey);
    const role = isOwnerRole(admin.role) ? "owner" : "staff";
    const token = signAdminToken({ id: admin._id.toString(), email: admin.email, role });
    await Admin.updateOne({ _id: admin._id }, { $set: { lastLoginAt: new Date() } });

    const res = jsonMessage("Login successful", {
      user: { id: admin._id.toString(), name: admin.name, email: admin.email, role },
      token,
    });
    res.cookies.set(ADMIN_COOKIE_NAME, token, COOKIE_OPTIONS);
    return res;
  } catch (error) {
    console.error("[API /auth/login]", error instanceof Error ? error.message : error);
    return jsonError("Login failed", 500);
  }
}
