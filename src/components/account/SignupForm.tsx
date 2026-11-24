"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "./AuthProvider";
import { AccountHeading, AccountPage, Field, LoadingCard, NotConfigured, Notice, SubmitButton } from "./ui";
import { EMAIL_MAX, NAME_MAX, PASSWORD_MAX, PASSWORD_RULES, authErrorCode, authErrorMessage, confirmError, emailError, nameError, passwordError } from "@/lib/customerAuth/rules";

// One rule source (rules.ts) for the website, the API and the app; Yup wraps it for Formik.
const rule = (fn: (v: unknown) => string | null) => Yup.string().test("rule", (v, ctx) => { const m = fn(v); return m ? ctx.createError({ message: m }) : true; });
const schema = Yup.object({
  name: rule(nameError),
  email: rule(emailError),
  password: rule(passwordError),
  confirm: Yup.string().test("match", (v, ctx) => { const m = confirmError(ctx.parent.password ?? "", v ?? ""); return m ? ctx.createError({ message: m }) : true; }),
});

export default function SignupForm() {
  const { configured, loading, user, verified, signup } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const submitting = useRef(false);

  useEffect(() => { if (!loading && user && verified) router.replace("/my-account"); }, [loading, user, verified, router]);

  const f = useFormik({
    initialValues: { name: "", email: "", password: "", confirm: "" },
    validationSchema: schema,
    onSubmit: async (v) => {
      if (submitting.current) return; // no double submissions
      submitting.current = true;
      setError("");
      try {
        const { verificationSent } = await signup(v.name, v.email, v.password);
        router.replace(`/verify-email?sent=${verificationSent ? "1" : "0"}`);
      } catch (e) {
        setError(authErrorMessage(authErrorCode(e), "signup"));
        f.setFieldValue("password", "", false);
        f.setFieldValue("confirm", "", false);
      } finally {
        submitting.current = false;
      }
    },
  });
  const err = (k: keyof typeof f.values) => (f.touched[k] && f.errors[k]) || undefined;

  if (!configured) return <AccountPage><AccountHeading eyebrow="Your account" title="Create an account" /><NotConfigured /></AccountPage>;
  if (loading) return <AccountPage><LoadingCard /></AccountPage>;

  return (
    <AccountPage>
      <AccountHeading eyebrow="Your account" title="Create an account" lead="Save your details with Sara Royal Boutique. We will email you a link to verify your address." />
      {error && <Notice tone="error"><p>{error}</p>{/already exists/.test(error) && <p><Link href="/login" className="acct_link">Log in</Link> · <Link href="/forgot-password" className="acct_link">Reset password</Link></p>}</Notice>}
      <form className="acct_form" onSubmit={f.handleSubmit} noValidate>
        <Field label="Full name" name="name" autoComplete="name" maxLength={NAME_MAX} value={f.values.name} onChange={f.handleChange} onBlur={f.handleBlur} error={err("name")} disabled={f.isSubmitting} />
        <Field label="Email address" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={EMAIL_MAX} value={f.values.email} onChange={f.handleChange} onBlur={f.handleBlur} error={err("email")} disabled={f.isSubmitting} />
        <Field label="Password" name="password" type="password" autoComplete="new-password" maxLength={PASSWORD_MAX} value={f.values.password} onChange={f.handleChange} onBlur={f.handleBlur} error={err("password")} disabled={f.isSubmitting}>
          <ul className="acct_rules" aria-label="Password requirements">
            {PASSWORD_RULES.map((r) => <li key={r.key} className={r.test(f.values.password) ? "is_met" : ""}>{r.label}</li>)}
          </ul>
        </Field>
        <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" maxLength={PASSWORD_MAX} value={f.values.confirm} onChange={f.handleChange} onBlur={f.handleBlur} error={err("confirm")} disabled={f.isSubmitting} />
        <SubmitButton busy={f.isSubmitting}>{f.isSubmitting ? "Creating your account…" : "Create account"}</SubmitButton>
      </form>
      <p className="acct_foot">Already have an account? <Link href="/login">Log in</Link></p>
    </AccountPage>
  );
}
