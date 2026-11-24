"use client";

// Login view (inside the auth modal). Same validation, Firebase call and error messages as before; what happens AFTER a
// successful login (close the modal and continue / show "verify your email") is decided by <AuthModal>.
import { useRef, useState, type ChangeEvent } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "./AuthProvider";
import { useAuthModal } from "./authModalContext";
import { AuthModalLayout } from "./AuthModalLayout";
import { Field, Notice, SubmitButton } from "./ui";
import { EMAIL_MAX, PASSWORD_MAX, authErrorCode, authErrorMessage, emailError } from "@/lib/customerAuth/rules";

const schema = Yup.object({
  email: Yup.string().test("rule", (v, ctx) => { const m = emailError(v); return m ? ctx.createError({ message: m }) : true; }),
  password: Yup.string().required("Please enter your password."),
});

export default function LoginForm() {
  const { login } = useAuth();
  const modal = useAuthModal();
  const [error, setError] = useState("");
  const submitting = useRef(false);

  const f = useFormik({
    initialValues: { email: modal.email, password: "" },
    validationSchema: schema,
    onSubmit: async (v) => {
      if (submitting.current) return; // no double submissions
      submitting.current = true;
      modal.setBusy(true);
      setError("");
      try {
        await login(v.email, v.password); // on success the modal closes / moves on by itself (session changed)
      } catch (e) {
        setError(authErrorMessage(authErrorCode(e), "login"));
        f.setFieldValue("password", "", false);
        submitting.current = false;
      } finally {
        modal.setBusy(false);
      }
    },
  });
  const err = (k: keyof typeof f.values) => (f.touched[k] && f.errors[k]) || undefined;
  const change = (e: ChangeEvent<HTMLInputElement>) => { modal.markDirty(); f.handleChange(e); };

  return (
    <AuthModalLayout eyebrow="Welcome back" title="Log in" lead="Sign in to your Sara Royal Boutique account.">
      {modal.notice && <Notice tone={modal.notice.tone}><p>{modal.notice.text}</p></Notice>}
      {error && <Notice tone="error"><p>{error}</p></Notice>}
      <form className="acct_form" onSubmit={f.handleSubmit} noValidate>
        <Field label="Email address" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={EMAIL_MAX} value={f.values.email} onChange={change} onBlur={f.handleBlur} error={err("email")} disabled={f.isSubmitting} />
        <Field label="Password" name="password" type="password" autoComplete="current-password" maxLength={PASSWORD_MAX} value={f.values.password} onChange={change} onBlur={f.handleBlur} error={err("password")} disabled={f.isSubmitting} />
        <div className="acct_row">
          <span />
          <button type="button" className="acct_inline" onClick={() => modal.switchView("forgot", f.values.email)} disabled={f.isSubmitting}>Forgot password?</button>
        </div>
        <SubmitButton busy={f.isSubmitting}>{f.isSubmitting ? "Logging in…" : "Log in"}</SubmitButton>
      </form>
      <p className="acct_foot">
        New to Sara Royal Boutique?{" "}
        <button type="button" className="acct_inline is_strong" onClick={() => modal.switchView("signup", f.values.email)} disabled={f.isSubmitting}>Create an account</button>
      </p>
    </AuthModalLayout>
  );
}
