// Server-side check of a customer's Firebase ID token (Authorization: Bearer <token>) with the Firebase Admin SDK.
// Verifying ID tokens needs only the PROJECT ID (Google's public signing keys are fetched by the SDK): no service-account
// key exists in this project, so there is no admin credential to leak. Customer identity = the verified Firebase UID.
// This is unrelated to the admin login (admin_session cookie + JWT_SECRET), which never accepts these tokens.
// The Admin SDK is loaded lazily, only when a token actually has to be checked: requests without a token always get a
// clean 401, and if the SDK cannot load on the host the failure is caught by the route (503 + logged error name).
import type { App } from "firebase-admin/app";

export type VerifiedCustomer = { uid: string; email: string; name: string; emailVerified: boolean; provider: string };
export class CustomerAuthError extends Error {
  constructor(public status: 401 | 403 | 503, message: string) { super(message); }
}

type Decoded = { uid: string; email?: string; email_verified?: boolean; name?: string; firebase?: { sign_in_provider?: string } };
type Verifier = (token: string) => Promise<Decoded>;

const APP_NAME = "sara-royal-customer-auth";

/** Firebase project id for token verification (server env first, then the public web config). */
export function customerProjectId(): string {
  const id = (process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
  return /^[a-z0-9-]{4,40}$/.test(id) ? id : "";
}

let testVerifier: Verifier | null = null;
/** Tests only: replace Google verification with a stub (refused outside NODE_ENV=test). */
export function setCustomerTokenVerifierForTests(v: Verifier | null) {
  if (process.env.NODE_ENV !== "test") throw new Error("test hook only");
  testVerifier = v;
}

async function verifier(): Promise<Verifier> {
  if (testVerifier && process.env.NODE_ENV === "test") return testVerifier;
  const projectId = customerProjectId();
  if (!projectId) throw new CustomerAuthError(503, "Customer accounts are not available right now.");
  const [{ getApps, initializeApp }, { getAuth }] = await Promise.all([import("firebase-admin/app"), import("firebase-admin/auth")]);
  const app: App = getApps().find((a) => a.name === APP_NAME) ?? initializeApp({ projectId }, APP_NAME);
  return (token) => getAuth(app).verifyIdToken(token) as Promise<Decoded>;
}

const bearer = (header: string | null) => {
  const m = /^Bearer ([A-Za-z0-9._-]{20,4096})$/.exec(header?.trim() ?? "");
  return m ? m[1] : null;
};

/**
 * Returns the verified customer, or throws CustomerAuthError (401 no/invalid/expired token; 403 email not verified or
 * not an email/password account). Signature, expiry, issuer and audience (this Firebase project) are checked by the SDK.
 */
export async function requireVerifiedCustomer(headers: Headers): Promise<VerifiedCustomer> {
  const token = bearer(headers.get("authorization"));
  if (!token) throw new CustomerAuthError(401, "Please log in.");
  const verify = await verifier();
  let d: Decoded;
  try {
    d = await verify(token);
  } catch {
    throw new CustomerAuthError(401, "Your session has expired. Please log in again.");
  }
  const provider = d.firebase?.sign_in_provider ?? "";
  if (!d.uid || provider !== "password" || !d.email) throw new CustomerAuthError(403, "This account cannot be used here.");
  if (d.email_verified !== true) throw new CustomerAuthError(403, "Please verify your email address first.");
  return { uid: d.uid, email: d.email.toLowerCase(), name: (d.name ?? "").trim(), emailVerified: true, provider };
}
