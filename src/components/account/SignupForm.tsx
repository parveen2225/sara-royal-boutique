"use client";

// Signup view (inside the auth modal). Same rules (rules.ts), Firebase call and error messages as before.
// After signup the customer is signed out again (see AuthProvider.signup) and shown "Check your inbox".
import { useRef, useState, type ChangeEvent } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "./AuthProvider";
import { useAuthModal } from "./authModalContext";
import { AuthModalLayout } from "./AuthModalLayout";
import { Field, Notice, SubmitButton } from "./ui";
import { EMAIL_MAX, NAME_MAX, PASSWORD_MAX, PASSWORD_RULES, authErrorCode, authErrorMessage, confirmError, emailError, nameError, normalizeEmail, passwordError } from "@/lib/customerAuth/rules";

// One rule source (rules.ts) for the website, the API and the app; Yup wraps it for Formik.
const rule = (fn: (v: unknown) => string | null) => Yup.string().test("rule", (v, ctx) => { const m = fn(v); return m ? ctx.createError({ message: m }) : true; });
const schema = Yup.object({
  name: rule(nameError),
  email: rule(emailError),
  password: rule(passwordError),
  confirm: Yup.string().test("match", (v, ctx) => { const m = confirmError(ctx.parent.password ?? "", v ?? ""); return m ? ctx.createError({ message: m }) : true; }),
});

export default function SignupForm() {
  const { signup } = useAuth();
  const modal = useAuthModal();
  const [error, setError] = useState("");
  const submitting = useRef(false);

  const f = useFormik({
    initialValues: { name: "", email: modal.email, password: "", confirm: "" },
    validationSchema: schema,
    onSubmit: async (v) => {
      if (submitting.current) return; // no double submissions
      submitting.current = true;
      modal.setBusy(true);
      modal.beginSignup(true); // Firebase signs the new account in for a moment: do not treat that as a login
      setError("");
      try {
        const { verificationSent } = await signup(v.name, v.email, v.password);
        modal.signedUp(normalizeEmail(v.email), verificationSent);
      } catch (e) {
        setError(authErrorMessage(authErrorCode(e), "signup"));
        f.setFieldValue("password", "", false);
        f.setFieldValue("confirm", "", false);
      } finally {
        submitting.current = false;
        modal.setBusy(false);
        modal.beginSignup(false);
      }
    },
  });
  const err = (k: keyof typeof f.values) => (f.touched[k] && f.errors[k]) || undefined;
  const change = (e: ChangeEvent<HTMLInputElement>) => { modal.markDirty(); f.handleChange(e); };

  return (
    <AuthModalLayout eyebrow="Join the boutique" title="Create an account" lead="Save your details with Sara Royal Boutique. We will email you a link to verify your address.">
      {error && (
        <Notice tone="error">
          <p>{error}</p>
          {/already exists/.test(error) && (
            <p>
              <button type="button" className="acct_inline" onClick={() => modal.switchView("login", f.values.email)}>Log in</button>
              {" · "}
              <button type="button" className="acct_inline" onClick={() => modal.switchView("forgot", f.values.email)}>Reset password</button>
            </p>
          )}
        </Notice>
      )}
      <form className="acct_form" onSubmit={f.handleSubmit} noValidate>
        <Field label="Full name" name="name" autoComplete="name" maxLength={NAME_MAX} value={f.values.name} onChange={change} onBlur={f.handleBlur} error={err("name")} disabled={f.isSubmitting} />
        <Field label="Email address" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={EMAIL_MAX} value={f.values.email} onChange={change} onBlur={f.handleBlur} error={err("email")} disabled={f.isSubmitting} />
        <Field label="Password" name="password" type="password" autoComplete="new-password" maxLength={PASSWORD_MAX} value={f.values.password} onChange={change} onBlur={f.handleBlur} error={err("password")} disabled={f.isSubmitting}>
          <ul className="acct_rules" aria-label="Password requirements">
            {PASSWORD_RULES.map((r) => <li key={r.key} className={r.test(f.values.password) ? "is_met" : ""}>{r.label}</li>)}
          </ul>
        </Field>
        <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" maxLength={PASSWORD_MAX} value={f.values.confirm} onChange={change} onBlur={f.handleBlur} error={err("confirm")} disabled={f.isSubmitting} />
        <SubmitButton busy={f.isSubmitting}>{f.isSubmitting ? "Creating your account…" : "Create account"}</SubmitButton>
      </form>
      <p className="acct_foot">
        Already have an account?{" "}
        <button type="button" className="acct_inline is_strong" onClick={() => modal.switchView("login", f.values.email)} disabled={f.isSubmitting}>Log in</button>
      </p>
    </AuthModalLayout>
  );
}
