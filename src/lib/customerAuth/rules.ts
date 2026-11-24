// Customer account rules shared by the website forms, the server API and (as a copy) the mobile app.
// Pure: no Firebase import, safe in the browser, on the server and in tests.

export const NAME_MIN = 2;
export const NAME_MAX = 60;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const EMAIL_MAX = 254;
/** Seconds between verification / reset emails from one screen (Firebase also rate-limits on its side). */
export const EMAIL_COOLDOWN_SECONDS = 60;

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const normalizeName = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
export const normalizeEmail = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");

export function nameError(v: unknown): string | null {
  const n = normalizeName(v);
  if (!n) return "Please enter your full name.";
  if (n.length < NAME_MIN) return `Name must be at least ${NAME_MIN} characters.`;
  if (n.length > NAME_MAX) return `Name must be at most ${NAME_MAX} characters.`;
  if (!NAME_RE.test(n)) return "Please use letters only (spaces, dots, apostrophes and hyphens are fine).";
  return null;
}

export function emailError(v: unknown): string | null {
  const e = normalizeEmail(v);
  if (!e) return "Please enter your email address.";
  if (e.length > EMAIL_MAX || !EMAIL_RE.test(e)) return "Please enter a valid email address.";
  return null;
}

export const PASSWORD_RULES = [
  { key: "length", label: `At least ${PASSWORD_MIN} characters`, test: (p: string) => p.length >= PASSWORD_MIN },
  { key: "upper", label: "An uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { key: "lower", label: "A lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { key: "number", label: "A number", test: (p: string) => /\d/.test(p) },
] as const;

export function passwordError(v: unknown): string | null {
  const p = typeof v === "string" ? v : "";
  if (!p) return "Please enter a password.";
  if (p.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters.`;
  if (/^\s|\s$/.test(p)) return "Password cannot start or end with a space.";
  const missing = PASSWORD_RULES.filter((r) => !r.test(p));
  return missing.length ? `Password needs: ${missing.map((r) => r.label.toLowerCase()).join(", ")}.` : null;
}

export const confirmError = (password: string, confirm: string) => (!confirm ? "Please confirm your password." : confirm !== password ? "Passwords do not match." : null);

/**
 * Only same-site paths are allowed after login (prevents open redirects): must start with a single "/", no
 * protocol-relative "//", no backslashes, no control characters, and never back to an auth page.
 */
export function safeNextPath(raw: unknown, fallback = "/my-account"): string {
  if (typeof raw !== "string" || raw.length > 512) return fallback;
  const v = raw.trim();
  let decoded = v;
  try { decoded = decodeURIComponent(v); } catch { return fallback; }
  for (const s of [v, decoded]) { // checked raw AND decoded, so "%2F%2Fevil.com" cannot slip through
    if (!s.startsWith("/") || s.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(s)) return fallback;
    if (/^\/(login|signup|forgot-password|verify-email)(\/|\?|#|$)/i.test(s) || /^\/admin(\/|\?|#|$)/i.test(s) || /^\/api\//i.test(s)) return fallback;
  }
  return v;
}

export type AuthAction = "signup" | "login" | "reset" | "verify" | "profile";

/** Customer-facing message for a Firebase Auth error code. Never reveals more than the action needs. */
export function authErrorMessage(code: unknown, action: AuthAction): string {
  const c = typeof code === "string" ? code : "";
  switch (c) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Please log in, or reset your password if you have forgotten it.";
    case "auth/invalid-email":
    case "auth/missing-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return "Please choose a stronger password.";
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return action === "login" ? "Incorrect email or password." : "Something went wrong. Please try again.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact the boutique on WhatsApp.";
    case "auth/too-many-requests":
    case "auth/quota-exceeded":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "No internet connection. Please check your connection and try again.";
    case "auth/requires-recent-login":
      return "For your security, please log in again and retry.";
    case "auth/operation-not-allowed":
    case "auth/configuration-not-found":
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
    case "auth/app-not-authorized":
    case "auth/unauthorized-domain":
    case "auth/unauthorized-continue-uri":
    case "auth/invalid-continue-uri":
      return "Customer accounts are not available right now. Please try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
}

/** Firebase error code from an unknown thrown value. */
export const authErrorCode = (e: unknown) => (e && typeof e === "object" && typeof (e as { code?: unknown }).code === "string" ? (e as { code: string }).code : "");
