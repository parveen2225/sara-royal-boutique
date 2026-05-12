import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export interface AdminTokenPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export const signAdminToken = (payload: Omit<AdminTokenPayload, "iat" | "exp">): string =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

export const verifyAdminToken = (token: string): AdminTokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
  } catch {
    return null;
  }
};

export const getTokenFromRequest = (request: NextRequest): string =>
  request.cookies.get(ADMIN_COOKIE_NAME)?.value ?? "";
