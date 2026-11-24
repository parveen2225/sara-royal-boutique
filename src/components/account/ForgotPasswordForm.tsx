"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "./AuthProvider";
import { AccountHeading, AccountPage, Field, NotConfigured, Notice, SubmitButton, useCooldown } from "./ui";
import { EMAIL_COOLDOWN_SECONDS, EMAIL_MAX, authErrorCode, authErrorMessage, emailError } from "@/lib/customerAuth/rules";

const schema = Yup.object({ email: Yup.string().test("rule", (v, ctx) => { const m = emailError(v); return m ? ctx.createError({ message: m }) : true; }) });

export default function ForgotPasswordForm() {
  const { configured, resetPassword } = useAuth();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const cooldown = useCooldown("sr_reset_cooldown_until");

  const f = useFormik({
    initialValues: { email: "" },
    validationSchema: schema,
    onSubmit: async (v) => {
      if (submitting.current || cooldown.remaining > 0) return;
      submitting.current = true;
      setError("");
      try {
        await resetPassword(v.email);
        setSent(true);
        cooldown.start(EMAIL_COOLDOWN_SECONDS);
      } catch (e) {
        setError(authErrorMessage(authErrorCode(e), "reset"));
      } finally {
        submitting.current = false;
      }
    },
  });

  if (!configured) return <AccountPage><AccountHeading eyebrow="Your account" title="Reset your password" /><NotConfigured /></AccountPage>;

  return (
    <AccountPage>
      <AccountHeading eyebrow="Your account" title="Reset your password" lead="Enter the email address you signed up with and we will send you a link to choose a new password." />
      {/* Same message whether or not an account exists, so this page cannot be used to discover customers' emails. */}
      {sent && <Notice tone="success"><p>If an account exists for this email, a password reset link is on its way. Please check your inbox and spam folder.</p></Notice>}
      {error && <Notice tone="error"><p>{error}</p></Notice>}
      <form className="acct_form" onSubmit={f.handleSubmit} noValidate>
        <Field label="Email address" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={EMAIL_MAX} value={f.values.email} onChange={f.handleChange} onBlur={f.handleBlur} error={(f.touched.email && f.errors.email) || undefined} disabled={f.isSubmitting} />
        <SubmitButton busy={f.isSubmitting} disabled={cooldown.remaining > 0}>
          {f.isSubmitting ? "Sending…" : cooldown.remaining > 0 ? `Send again in ${cooldown.remaining}s` : sent ? "Send another link" : "Send reset link"}
        </SubmitButton>
      </form>
      <p className="acct_foot"><Link href="/login">Back to Login</Link></p>
    </AccountPage>
  );
}
