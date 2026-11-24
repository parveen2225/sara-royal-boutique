"use client";

// Shared state between the auth modal and the views inside it (login, signup, forgot password, verify email).
// The views keep all of their own form + Firebase logic; this context only handles presentation concerns:
// switching views, the "don't close while busy / unsaved" guard, and a few values carried between views.
import { createContext, useContext } from "react";

export type AuthView = "login" | "signup" | "forgot" | "verify";
export type FlashNotice = { tone: "success" | "info" | "error"; text: string };

export const AUTH_TITLE_ID = "acct-modal-title";

export type AuthModalContextValue = {
  /** email typed in the previous view (carried across Login / Signup / Forgot password) */
  email: string;
  /** one-time message shown on the login view (e.g. "Thank you for verifying your email") */
  notice: FlashNotice | null;
  /** inbox = "we sent you a link" (signed out); required = logged in but the email is not verified yet */
  verifyMode: "inbox" | "required";
  /** signup succeeded but the verification email could not be sent */
  sendFailed: boolean;
  /** email address the signup just used (verify view, inbox mode) */
  pendingEmail: string;
  switchView: (view: AuthView, email?: string) => void;
  /** a field was edited: an outside click will no longer close the modal and lose the input */
  markDirty: () => void;
  /** a request is in flight: the modal cannot be closed */
  setBusy: (busy: boolean) => void;
  /** Firebase signs a new account in for a moment during signup; the modal ignores that transient session */
  beginSignup: (active: boolean) => void;
  signedUp: (email: string, verificationSent: boolean) => void;
};

export const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used inside <AuthModal>");
  return ctx;
}
