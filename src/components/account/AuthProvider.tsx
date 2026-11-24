"use client";

// Customer session (Firebase Authentication, email + password) for the account pages.
// Completely separate from the admin login: no cookies are set, nothing here reaches /api/admin, and the admin JWT is
// never read. Passwords are passed straight to Firebase and never stored or logged.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword, onIdTokenChanged, reload, sendEmailVerification, sendPasswordResetEmail,
  signInWithEmailAndPassword, signOut, updateProfile, type ActionCodeSettings, type User,
} from "firebase/auth";
import { getCustomerAuth, isCustomerAuthConfigured } from "@/lib/customerAuth/firebaseClient";
import { authErrorCode, normalizeEmail, normalizeName } from "@/lib/customerAuth/rules";

export type CustomerProfile = { uid: string; name: string; email: string; createdAt?: string };
export type LoginResult = { verified: boolean };

type AuthContextValue = {
  configured: boolean;
  /** true until Firebase has restored (or ruled out) a remembered session */
  loading: boolean;
  user: User | null;
  verified: boolean;
  signup: (name: string, email: string, password: string) => Promise<{ verificationSent: boolean }>;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  resendVerification: () => Promise<void>;
  /** Re-reads the account from Firebase (after the customer clicked the email link) and refreshes the ID token. */
  refreshVerification: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  /** Authenticated call to the boutique's customer API with a fresh Firebase ID token (never a cookie). */
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
  updateName: (name: string) => Promise<CustomerProfile>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const PENDING_EMAIL_KEY = "sr_pending_verification_email"; // sessionStorage: the email only, never a password

const continueUrl = (path: string): ActionCodeSettings | undefined =>
  typeof window === "undefined" ? undefined : { url: `${window.location.origin}${path}` };

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isCustomerAuthConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(configured);
  const refreshedOnce = useRef(false);

  useEffect(() => {
    if (!configured) return;
    const auth = getCustomerAuth();
    return onIdTokenChanged(auth, async (u) => {
      // A remembered but unverified session: re-check once, the customer may have verified on another device.
      if (u && !u.emailVerified && !refreshedOnce.current) {
        refreshedOnce.current = true;
        try { await reload(u); if (u.emailVerified) await u.getIdToken(true); } catch { /* offline: keep the cached state */ }
      }
      setUser(u);
      setVerified(Boolean(u?.emailVerified));
      setLoading(false);
    });
  }, [configured]);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const auth = getCustomerAuth();
    const cred = await createUserWithEmailAndPassword(auth, normalizeEmail(email), password);
    let verificationSent = true;
    try {
      await updateProfile(cred.user, { displayName: normalizeName(name) });
      await sendEmailVerification(cred.user, continueUrl("/login?verified=1"));
    } catch {
      verificationSent = false; // account exists; the customer can resend from the verification screen after logging in
    }
    try { sessionStorage.setItem(PENDING_EMAIL_KEY, normalizeEmail(email)); } catch { /* storage blocked */ }
    // Firebase signs a new account in immediately. The intended journey is Signup -> verify email -> Login, so end
    // that automatic session now: nothing protected is reachable before the customer verifies and logs in.
    await signOut(auth);
    return { verificationSent };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const auth = getCustomerAuth();
    const cred = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
    try { await reload(cred.user); } catch { /* use the state from sign-in */ }
    if (cred.user.emailVerified) await cred.user.getIdToken(true); // token must carry email_verified=true for the API
    setUser(auth.currentUser);
    setVerified(Boolean(auth.currentUser?.emailVerified));
    return { verified: Boolean(auth.currentUser?.emailVerified) };
  }, []);

  const logout = useCallback(async () => {
    try { sessionStorage.removeItem(PENDING_EMAIL_KEY); } catch { /* ignore */ }
    if (configured) await signOut(getCustomerAuth());
  }, [configured]);

  const resendVerification = useCallback(async () => {
    const u = getCustomerAuth().currentUser;
    if (!u) throw Object.assign(new Error("not signed in"), { code: "auth/requires-recent-login" });
    await sendEmailVerification(u, continueUrl("/login?verified=1"));
  }, []);

  const refreshVerification = useCallback(async () => {
    const auth = getCustomerAuth();
    const u = auth.currentUser;
    if (!u) return false;
    await reload(u);
    if (u.emailVerified) await u.getIdToken(true);
    setUser(auth.currentUser);
    setVerified(Boolean(auth.currentUser?.emailVerified));
    return Boolean(auth.currentUser?.emailVerified);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(getCustomerAuth(), normalizeEmail(email), continueUrl("/login?reset=1"));
    } catch (e) {
      // Never reveal whether an account exists: "no such user" is reported as success, like any real send.
      if (["auth/user-not-found", "auth/invalid-credential"].includes(authErrorCode(e))) return;
      throw e;
    }
  }, []);

  const authFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    const u = getCustomerAuth().currentUser;
    if (!u) throw Object.assign(new Error("not signed in"), { code: "auth/requires-recent-login" });
    const token = await u.getIdToken();
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept", "application/json");
    return fetch(path, { ...init, headers, credentials: "omit", cache: "no-store" }); // no cookies: never the admin session
  }, []);

  const updateName = useCallback(async (name: string) => {
    const clean = normalizeName(name);
    const res = await authFetch("/api/customer/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: clean }) });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.message ?? "Could not save your profile. Please try again.");
    const u = getCustomerAuth().currentUser;
    if (u) await updateProfile(u, { displayName: clean }).catch(() => undefined); // keep Firebase in step (shown in emails)
    return body.data as CustomerProfile;
  }, [authFetch]);

  const value = useMemo<AuthContextValue>(() => ({
    configured, loading, user, verified, signup, login, logout, resendVerification, refreshVerification, resetPassword, authFetch, updateName,
  }), [configured, loading, user, verified, signup, login, logout, resendVerification, refreshVerification, resetPassword, authFetch, updateName]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
