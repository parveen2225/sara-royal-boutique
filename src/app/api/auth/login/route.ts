import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import Admin from "@/models/Admin";
import { ADMIN_COOKIE_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } from "@/lib/admin/constants";
import { jsonError, jsonMessage } from "@/lib/api/utils";
import { signAdminToken } from "@/lib/auth/session";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password) {
      return jsonError("Email and password are required", 400);
    }

    if (!isMongoConfigured()) {
      if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return jsonError("Invalid email or password", 401);
      }
      const token = signAdminToken({ id: "demo-admin", email: ADMIN_EMAIL, role: "admin" });
      const res = jsonMessage("Login successful", {
        user: { id: "demo-admin", name: "Admin", email: ADMIN_EMAIL, role: "admin" },
        token,
      });
      res.cookies.set(ADMIN_COOKIE_NAME, token, COOKIE_OPTIONS);
      return res;
    }

    try {
      await connectMongo();
    } catch (mongoError) {
      console.error("[API /auth/login] Mongo unavailable, trying credential fallback", mongoError);
      if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return jsonError("Invalid email or password", 401);
      }
      const token = signAdminToken({ id: "fallback-admin", email: ADMIN_EMAIL, role: "admin" });
      const res = jsonMessage("Login successful (fallback mode)", {
        user: { id: "fallback-admin", name: "Admin", email: ADMIN_EMAIL, role: "admin" },
        token,
      });
      res.cookies.set(ADMIN_COOKIE_NAME, token, COOKIE_OPTIONS);
      return res;
    }

    let admin = await Admin.findOne({ email }).select("+password");

    if (!admin && email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      admin = await Admin.create({
        name: "Admin",
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: "admin",
      });
      admin = await Admin.findOne({ email }).select("+password");
    }

    const validPassword = admin ? await bcrypt.compare(password, admin.password) : false;
    if (!admin || !validPassword) {
      return jsonError("Invalid email or password", 401);
    }

    const token = signAdminToken({
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });

    const res = jsonMessage("Login successful", {
      user: { id: admin._id.toString(), name: admin.name, email: admin.email, role: admin.role },
      token,
    });
    res.cookies.set(ADMIN_COOKIE_NAME, token, COOKIE_OPTIONS);
    return res;
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Login failed", 500);
  }
}
