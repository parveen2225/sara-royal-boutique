import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { jsonError } from "@/lib/api/utils";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { CustomerAuthError, requireVerifiedCustomer } from "@/lib/customerAuth/verifyToken";
import { nameError, normalizeName } from "@/lib/customerAuth/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The signed-in customer's own profile. Identity comes ONLY from the verified Firebase ID token (Bearer header):
// there is no id/uid parameter, so one customer can never read or change another customer's profile.
// No cookies are read or set (the admin session is never involved).
const NO_STORE = { "Cache-Control": "private, no-store" };
type CustomerDoc = { firebaseUid: string; email: string; name: string; createdAt?: Date };
const publicProfile = (c: CustomerDoc) => ({ uid: c.firebaseUid, email: c.email, name: c.name, createdAt: c.createdAt });

async function authenticate(req: NextRequest, limit: number) {
  if (!rateLimit(`customer-me:${clientIp(req.headers)}`, limit, 60_000).allowed) return { error: jsonError("Too many requests. Please wait a minute.", 429) };
  try {
    const customer = await requireVerifiedCustomer(req.headers);
    if (!isMongoConfigured()) return { error: jsonError("Your account is temporarily unavailable. Please try again later.", 503) };
    await connectMongo();
    return { customer };
  } catch (e) {
    if (e instanceof CustomerAuthError) return { error: jsonError(e.message, e.status) };
    console.error("[API /customer/me] auth failed", e instanceof Error ? e.name : "error"); // never the token
    return { error: jsonError("Your account is temporarily unavailable. Please try again later.", 503) };
  }
}

/** Returns (and on first visit creates) the customer's profile, keyed by Firebase UID. */
export async function GET(req: NextRequest) {
  const a = await authenticate(req, 60);
  if ("error" in a) return a.error;
  const { customer } = a;
  const doc = await Customer.findOneAndUpdate(
    { firebaseUid: customer.uid },
    { $set: { email: customer.email, lastSeenAt: new Date() }, $setOnInsert: { firebaseUid: customer.uid, name: normalizeName(customer.name).slice(0, 60) } },
    { upsert: true, returnDocument: "after", runValidators: true },
  ).lean<CustomerDoc>();
  return NextResponse.json({ data: publicProfile(doc!) }, { headers: NO_STORE });
}

/** Edit Profile: only the display name can be changed here (email/password changes go through Firebase). */
export async function PATCH(req: NextRequest) {
  const a = await authenticate(req, 20);
  if ("error" in a) return a.error;
  const body = await req.json().catch(() => null);
  const keys = body && typeof body === "object" ? Object.keys(body) : [];
  if (!keys.length || keys.some((k) => k !== "name")) return jsonError("Only your name can be changed here.", 400);
  const problem = nameError(body.name);
  if (problem) return jsonError(problem, 400);
  const doc = await Customer.findOneAndUpdate(
    { firebaseUid: a.customer.uid },
    { $set: { name: normalizeName(body.name), email: a.customer.email, lastSeenAt: new Date() }, $setOnInsert: { firebaseUid: a.customer.uid } },
    { upsert: true, returnDocument: "after", runValidators: true },
  ).lean<CustomerDoc>();
  return NextResponse.json({ message: "Profile saved.", data: publicProfile(doc!) }, { headers: NO_STORE });
}
