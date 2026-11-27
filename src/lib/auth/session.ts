import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";

export interface AdminTokenPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  /** Issue time in milliseconds, so session revocation is exact (iat alone is whole seconds). */
  iatMs?: number;
  exp?: number;
}

// No hardcoded fallback: JWT_SECRET is mandatory, and must be at least 32 characters in production.
const getSecret = (): string => {
  const secret = process.env.JWT_SECRET?.trim() ?? "";
  if (!secret) throw new Error("JWT_SECRET is not set. Add a long random value to the environment.");
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production.");
  }
  return secret;
};

/**
 * Why admin sessions cannot be issued on this server (or null when they can). The text names the variable and the rule,
 * never its value, so it is safe to write to server logs. The login route calls this BEFORE it looks at any credentials:
 * a misconfigured server then answers every attempt the same way, instead of "401 for a wrong password, 500 for the right
 * one", which would tell an attacker when a guess is correct.
 */
export const adminAuthConfigProblem = (): string | null => {
  try {
    getSecret();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Admin session secret is not usable.";
  }
};

export const signAdminToken = (payload: Omit<AdminTokenPayload, "iat" | "exp">): string =>
  jwt.sign({ ...payload, iatMs: Date.now() }, getSecret(), { expiresIn: "7d", algorithm: "HS256" });

export const verifyAdminToken = (token: string): AdminTokenPayload | null => {
  try {
    return jwt.verify(token, getSecret(), { algorithms: ["HS256"] }) as AdminTokenPayload;
  } catch {
    return null;
  }
};

export const getTokenFromRequest = (request: NextRequest): string =>
  request.cookies.get(ADMIN_COOKIE_NAME)?.value ?? "";
