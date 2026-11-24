"use client";

// Two cases:
//  - just signed up (signed out on purpose): "check your inbox", then log in;
//  - logged in but not verified yet: "Email verification required", with resend + "I've verified" + log out.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PENDING_EMAIL_KEY, useAuth } from "./AuthProvider";
import { AccountHeading, AccountPage, LoadingCard, NotConfigured, Notice, useCooldown } from "./ui";
import { EMAIL_COOLDOWN_SECONDS, authErrorCode, authErrorMessage } from "@/lib/customerAuth/rules";

export default function VerifyEmailView() {
  const { configured, loading, user, verified, resendVerification, refreshVerification, logout } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [pendingEmail] = useState(() => { if (typeof window === "undefined") return ""; try { return window.sessionStorage.getItem(PENDING_EMAIL_KEY) ?? ""; } catch { return ""; } });
  const [busy, setBusy] = useState<"" | "resend" | "check" | "logout">("");
  const [msg, setMsg] = useState<{ tone: "info" | "error" | "success"; text: string } | null>(null);
  const cooldown = useCooldown("sr_verify_cooldown_until");

  useEffect(() => { if (!loading && user && verified) router.replace("/my-account"); }, [loading, user, verified, router]);

  if (!configured) return <AccountPage><AccountHeading eyebrow="Your account" title="Verify your email" /><NotConfigured /></AccountPage>;
  if (loading || (user && verified)) return <AccountPage><LoadingCard /></AccountPage>;

  if (!user) {
    const sendFailed = params?.get("sent") === "0";
    return (
      <AccountPage>
        <AccountHeading eyebrow="Almost done" title="Check your inbox" lead={<>We have sent a verification link to <strong>{pendingEmail || "your email address"}</strong>.</>} />
        {sendFailed && <Notice tone="error"><p>Your account was created, but we could not send the email just now. Log in and choose “Resend verification email”.</p></Notice>}
        <ol className="acct_steps">
          <li>Open the email from Sara Royal Boutique (check your spam or promotions folder too).</li>
          <li>Tap <strong>the verification link</strong>.</li>
          <li>Come back and <strong>log in</strong> with your email and password.</li>
        </ol>
        <div className="acct_actions"><Link href="/login" className="acct_btn is_solid is_block">Go to Login</Link></div>
        <p className="acct_foot">Wrong email? <Link href="/signup">Create the account again</Link></p>
      </AccountPage>
    );
  }

  const resend = async () => {
    if (busy || cooldown.remaining > 0) return;
    setBusy("resend"); setMsg(null);
    try {
      await resendVerification();
      cooldown.start(EMAIL_COOLDOWN_SECONDS);
      setMsg({ tone: "success", text: `A new verification link was sent to ${user.email}.` });
    } catch (e) {
      setMsg({ tone: "error", text: authErrorMessage(authErrorCode(e), "verify") });
    } finally { setBusy(""); }
  };
  const check = async () => {
    if (busy) return;
    setBusy("check"); setMsg(null);
    try {
      if (await refreshVerification()) { router.replace("/my-account"); return; }
      setMsg({ tone: "info", text: "Your email is not verified yet. Please tap the link in the email, then try again." });
    } catch (e) {
      setMsg({ tone: "error", text: authErrorMessage(authErrorCode(e), "verify") });
    } finally { setBusy(""); }
  };
  const out = async () => { setBusy("logout"); await logout().catch(() => undefined); router.replace("/login"); };

  return (
    <AccountPage>
      <AccountHeading eyebrow="Your account" title="Email verification required" lead={<>Please verify <strong>{user.email}</strong> to use your account. We sent you a link when you signed up.</>} />
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
    </AccountPage>
  );
}
