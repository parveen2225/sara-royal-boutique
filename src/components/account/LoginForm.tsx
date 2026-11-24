"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "./AuthProvider";
import { AccountHeading, AccountPage, Field, LoadingCard, NotConfigured, Notice, SubmitButton } from "./ui";
import { EMAIL_MAX, PASSWORD_MAX, authErrorCode, authErrorMessage, emailError, safeNextPath } from "@/lib/customerAuth/rules";

const schema = Yup.object({
  email: Yup.string().test("rule", (v, ctx) => { const m = emailError(v); return m ? ctx.createError({ message: m }) : true; }),
  password: Yup.string().required("Please enter your password."),
});

export default function LoginForm() {
  const { configured, loading, user, verified, login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params?.get("next")); // same-site paths only: no open redirects
  const [error, setError] = useState("");
  const submitting = useRef(false);

  // Remembered session: go straight on (verified) or to the verification screen (not yet verified).
  useEffect(() => {
    if (loading || submitting.current || !user) return;
    router.replace(verified ? next : "/verify-email");
  }, [loading, user, verified, next, router]);

  const f = useFormik({
    initialValues: { email: "", password: "" },
    validationSchema: schema,
    onSubmit: async (v) => {
      if (submitting.current) return;
      submitting.current = true;
      setError("");
      try {
        const r = await login(v.email, v.password);
        router.replace(r.verified ? next : "/verify-email");
      } catch (e) {
        setError(authErrorMessage(authErrorCode(e), "login"));
        f.setFieldValue("password", "", false);
        submitting.current = false;
      }
    },
  });
  const err = (k: keyof typeof f.values) => (f.touched[k] && f.errors[k]) || undefined;

  if (!configured) return <AccountPage><AccountHeading eyebrow="Your account" title="Log in" /><NotConfigured /></AccountPage>;
  if (loading || (user && !error)) return <AccountPage><LoadingCard /></AccountPage>;

  const flash = params?.get("verified") === "1" ? "Thank you for verifying your email. Please log in." : params?.get("reset") === "1" ? "Your password was changed. Please log in with your new password." : "";
  return (
    <AccountPage>
      <AccountHeading eyebrow="Your account" title="Log in" lead="Welcome back to Sara Royal Boutique." />
      {flash && <Notice tone="success"><p>{flash}</p></Notice>}
      {error && <Notice tone="error"><p>{error}</p></Notice>}
      <form className="acct_form" onSubmit={f.handleSubmit} noValidate>
        <Field label="Email address" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={EMAIL_MAX} value={f.values.email} onChange={f.handleChange} onBlur={f.handleBlur} error={err("email")} disabled={f.isSubmitting} />
        <Field label="Password" name="password" type="password" autoComplete="current-password" maxLength={PASSWORD_MAX} value={f.values.password} onChange={f.handleChange} onBlur={f.handleBlur} error={err("password")} disabled={f.isSubmitting} />
        <div className="acct_row"><span /><Link href="/forgot-password" className="acct_link">Forgot password?</Link></div>
        <SubmitButton busy={f.isSubmitting}>{f.isSubmitting ? "Logging in…" : "Log in"}</SubmitButton>
      </form>
      <p className="acct_foot">New to Sara Royal Boutique? <Link href="/signup">Create an account</Link></p>
    </AccountPage>
  );
}
