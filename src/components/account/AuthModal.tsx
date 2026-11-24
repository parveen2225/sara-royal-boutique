"use client";

// The one reusable customer-auth modal: Login, Signup, Forgot password and Verify email views with internal switching.
// Presentation only: every view keeps its own form + Firebase logic (see LoginForm etc. and AuthProvider).
// Must be rendered inside <AuthProvider>.
//
// Closing: close button and ESC always work (except while a request is running); an outside click closes it only when
// nothing has been typed, so a half-filled signup form is never lost by accident.
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { useAuth } from "./AuthProvider";
import { AUTH_TITLE_ID, AuthModalContext, type AuthModalContextValue, type AuthView, type FlashNotice } from "./authModalContext";
import { AuthModalLayout } from "./AuthModalLayout";
import { CloseIcon } from "./icons";
import { LoadingCard, NotConfigured } from "./ui";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import ForgotPasswordForm from "./ForgotPasswordForm";
import VerifyEmailView from "./VerifyEmailView";

export type AuthModalProps = {
  open: boolean;
  initialView?: AuthView;
  /** same-site path to continue to once the customer is logged in with a verified email */
  next?: string;
  initialEmail?: string;
  /** one-time message for the login view */
  notice?: FlashNotice | null;
  /** signup worked but the verification email failed (verify view) */
  sendFailed?: boolean;
  /** the customer dismissed the modal */
  onClose: () => void;
  /** a verified customer is logged in: continue to `dest` */
  onAuthenticated: (dest: string) => void;
};

export default function AuthModal({ open, initialView = "login", next = "/my-account", initialEmail = "", notice = null, sendFailed = false, onClose, onAuthenticated }: AuthModalProps) {
  const { configured, loading, user, verified } = useAuth();
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState(initialEmail);
  const [flash, setFlash] = useState<FlashNotice | null>(notice);
  const [signup, setSignup] = useState<{ email: string; sent: boolean } | null>(null);
  const [signingUp, setSigningUp] = useState(false);
  const [shake, setShake] = useState(false);
  const guard = useRef({ busy: false, dirty: false, esc: false });
  const finish = useRef(onAuthenticated);
  useEffect(() => { finish.current = onAuthenticated; });

  // The session Firebase creates for a moment while signing up is ignored (signup ends it again right away).
  const sessionUser = signingUp ? null : user;
  // Logged in but not verified (e.g. right after a login, or a remembered session): the verify view takes over.
  const shown: AuthView = sessionUser && !verified && (view === "login" || view === "signup") ? "verify" : view;
  const redirecting = Boolean(configured && !loading && sessionUser && verified && shown !== "forgot");

  // A verified customer is logged in (just now or remembered): leave the modal and continue.
  useEffect(() => { if (open && redirecting) finish.current(next); }, [open, redirecting, next]);

  const ctx = useMemo<AuthModalContextValue>(() => ({
    email,
    notice: flash,
    verifyMode: !signup && sessionUser ? "required" : "inbox",
    sendFailed: signup ? !signup.sent : sendFailed,
    pendingEmail: signup?.email ?? "",
    switchView: (v, e) => { guard.current.dirty = false; setFlash(null); setSignup(null); if (e !== undefined) setEmail(e); setView(v); },
    markDirty: () => { guard.current.dirty = true; },
    setBusy: (b) => { guard.current.busy = b; },
    beginSignup: setSigningUp,
    signedUp: (e, sent) => { guard.current.dirty = false; setFlash(null); setSignup({ email: e, sent }); setEmail(""); setView("verify"); },
  }), [email, flash, signup, sessionUser, sendFailed]);

  const requestClose = (explicit: boolean) => {
    const g = guard.current;
    if (g.busy) return; // a request is running
    if (g.dirty && !explicit) { setShake(true); setTimeout(() => setShake(false), 450); return; } // outside click with typed input
    onClose();
  };
  const onHide = () => { const viaEsc = guard.current.esc; guard.current.esc = false; requestClose(viaEsc); };

  let body;
  if (!configured) {
    body = <AuthModalLayout eyebrow="Your account" title="Customer accounts"><NotConfigured /></AuthModalLayout>;
  } else if (shown !== "forgot" && (loading || redirecting)) {
    body = <AuthModalLayout eyebrow="Your account" title="Sara Royal Boutique"><LoadingCard label={redirecting ? "Taking you to your account…" : "Opening your account…"} /></AuthModalLayout>;
  } else if (shown === "signup") body = <SignupForm />;
  else if (shown === "forgot") body = <ForgotPasswordForm />;
  else if (shown === "verify") body = <VerifyEmailView />;
  else body = <LoginForm />;

  return (
    <Modal
      show={open}
      onHide={onHide}
      onEscapeKeyDown={() => { guard.current.esc = true; }}
      onExited={() => { guard.current = { busy: false, dirty: false, esc: false }; setView(initialView); setEmail(initialEmail); setFlash(notice); setSignup(null); }}
      centered
      animation
      aria-labelledby={AUTH_TITLE_ID}
      dialogClassName="acct_dialog"
      contentClassName={`acct_modal ${shake ? "is_shake" : ""}`}
      backdropClassName="acct_backdrop"
    >
      <button type="button" className="acct_close" onClick={() => requestClose(true)} aria-label="Close">
        <CloseIcon size={18} />
      </button>
      <Modal.Body className="acct_modal_body">
        <AuthModalContext.Provider value={ctx}>
          <div key={`${shown}-${signup ? "s" : ""}`} className="acct_view">{body}</div>
        </AuthModalContext.Provider>
      </Modal.Body>
    </Modal>
  );
}
