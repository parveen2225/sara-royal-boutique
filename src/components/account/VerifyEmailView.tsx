"use client";

// Verify-email view (inside the auth modal). Two cases, same behaviour as before:
//  - inbox: just signed up (signed out on purpose): "check your inbox", then log in;
//  - required: logged in but not verified yet: resend (60s cooldown) + "I have verified my email" + log out.
import { useState } from "react";
import { PENDING_EMAIL_KEY, useAuth } from "./AuthProvider";
import { useAuthModal } from "./authModalContext";
import { AuthModalLayout } from "./AuthModalLayout";
import { MailIcon } from "./icons";
import { Notice, useCooldown } from "./ui";
import { EMAIL_COOLDOWN_SECONDS, authErrorCode, authErrorMessage } from "@/lib/customerAuth/rules";

export default function VerifyEmailView() {
  const { user, resendVerification, refreshVerification, logout } = useAuth();
  const modal = useAuthModal();
  const [stored] = useState(() => { if (typeof window === "undefined") return ""; try { return window.sessionStorage.getItem(PENDING_EMAIL_KEY) ?? ""; } catch { return ""; } });
  const [busy, setBusy] = useState<"" | "resend" | "check" | "logout">("");
  const [msg, setMsg] = useState<{ tone: "info" | "error" | "success"; text: string } | null>(null);
  const cooldown = useCooldown("sr_verify_cooldown_until");

  if (modal.verifyMode === "inbox" || !user) {
    const email = modal.pendingEmail || stored;
    return (
      <AuthModalLayout eyebrow="Almost done" title="Check your inbox" icon={<MailIcon size={26} />}
        lead={<>We have sent a verification link to <strong>{email || "your email address"}</strong>.</>}>
        {modal.sendFailed && <Notice tone="error"><p>Your account was created, but we could not send the email just now. Log in and choose “Resend verification email”.</p></Notice>}
        <ol className="acct_steps">
          <li><div>Open the email from Sara Royal Boutique <span>(check spam or promotions too)</span>.</div></li>
          <li><div>Tap <strong>the verification link</strong>.</div></li>
          <li><div>Come back and <strong>log in</strong> with your email and password.</div></li>
        </ol>
        <div className="acct_actions">
          <button type="button" className="acct_btn is_solid is_block" onClick={() => modal.switchView("login")}>Go to login</button>
        </div>
        <p className="acct_foot">
          Wrong email?{" "}
          <button type="button" className="acct_inline is_strong" onClick={() => modal.switchView("signup")}>Create the account again</button>
        </p>
      </AuthModalLayout>
    );
  }

  const resend = async () => {
    if (busy || cooldown.remaining > 0) return;
    setBusy("resend"); setMsg(null); modal.setBusy(true);
    try {
      await resendVerification();
      cooldown.start(EMAIL_COOLDOWN_SECONDS);
      setMsg({ tone: "success", text: `A new verification link was sent to ${user.email}.` });
    } catch (e) {
      setMsg({ tone: "error", text: authErrorMessage(authErrorCode(e), "verify") });
    } finally { setBusy(""); modal.setBusy(false); }
  };
  const check = async () => {
    if (busy) return;
    setBusy("check"); setMsg(null); modal.setBusy(true);
    try {
      // When verified, the session changes and the modal moves on to My Account by itself.
      if (!(await refreshVerification())) setMsg({ tone: "info", text: "Your email is not verified yet. Please tap the link in the email, then try again." });
    } catch (e) {
      setMsg({ tone: "error", text: authErrorMessage(authErrorCode(e), "verify") });
    } finally { setBusy(""); modal.setBusy(false); }
  };
  const out = async () => {
    setBusy("logout");
    await logout().catch(() => undefined);
    modal.switchView("login");
  };

  return (
    <AuthModalLayout eyebrow="One last step" title="Email verification required" icon={<MailIcon size={26} />}
      lead={<>Please verify <strong>{user.email}</strong> to use your account. We sent you a link when you signed up.</>}>
      {msg && <Notice tone={msg.tone}><p>{msg.text}</p></Notice>}
      <div className="acct_actions">
        <button type="button" className="acct_btn is_solid is_block" onClick={check} disabled={!!busy} aria-busy={busy === "check" || undefined}>
          {busy === "check" && <span className="acct_spinner" aria-hidden="true" />} I have verified my email
        </button>
        <button type="button" className="acct_btn is_block" onClick={resend} disabled={!!busy || cooldown.remaining > 0} aria-busy={busy === "resend" || undefined}>
          {busy === "resend" && <span className="acct_spinner" aria-hidden="true" />} {cooldown.remaining > 0 ? `Resend in ${cooldown.remaining}s` : "Resend verification email"}
        </button>
        <button type="button" className="acct_btn is_link" onClick={out} disabled={!!busy}>Log out</button>
      </div>
    </AuthModalLayout>
  );
}
