"use client";

// Forgot password view (inside the auth modal) with its "check your inbox" success state.
// Same Firebase call, same generic message whether or not an account exists, same 60s resend cooldown.
import { useRef, useState, type ChangeEvent } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "./AuthProvider";
import { useAuthModal } from "./authModalContext";
import { AuthModalLayout } from "./AuthModalLayout";
import { MailIcon } from "./icons";
import { Field, Notice, SubmitButton, useCooldown } from "./ui";
import { EMAIL_COOLDOWN_SECONDS, EMAIL_MAX, authErrorCode, authErrorMessage, emailError } from "@/lib/customerAuth/rules";

const schema = Yup.object({ email: Yup.string().test("rule", (v, ctx) => { const m = emailError(v); return m ? ctx.createError({ message: m }) : true; }) });

export default function ForgotPasswordForm() {
  const { resetPassword, user } = useAuth();
  const modal = useAuthModal();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const cooldown = useCooldown("sr_reset_cooldown_until");

  const f = useFormik({
    initialValues: { email: modal.email },
    validationSchema: schema,
    onSubmit: async (v) => {
      if (submitting.current || cooldown.remaining > 0) return;
      submitting.current = true;
      modal.setBusy(true);
      setError("");
      try {
        await resetPassword(v.email);
        setSent(true);
        cooldown.start(EMAIL_COOLDOWN_SECONDS);
      } catch (e) {
        setError(authErrorMessage(authErrorCode(e), "reset"));
      } finally {
        submitting.current = false;
        modal.setBusy(false);
      }
    },
  });
  const change = (e: ChangeEvent<HTMLInputElement>) => { modal.markDirty(); f.handleChange(e); };
  const back = () => modal.switchView("login", f.values.email);

  if (sent) {
    return (
      <AuthModalLayout eyebrow="Reset link sent" title="Check your inbox" icon={<MailIcon size={26} />}>
        {/* Same message whether or not an account exists, so this cannot be used to discover customers' emails. */}
        <Notice tone="success"><p>If an account exists for this email, a password reset link is on its way. Please check your inbox and spam folder.</p></Notice>
        <div className="acct_actions">
          <button type="button" className="acct_btn is_solid is_block" onClick={back}>{user ? "Done" : "Back to login"}</button>
          <button type="button" className="acct_btn is_block" onClick={() => { setSent(false); }} disabled={cooldown.remaining > 0}>
            {cooldown.remaining > 0 ? `Send again in ${cooldown.remaining}s` : "Send another link"}
          </button>
        </div>
      </AuthModalLayout>
    );
  }

  return (
    <AuthModalLayout eyebrow="Account help" title="Reset your password" lead="Enter the email address you signed up with and we will send you a link to choose a new password.">
      {error && <Notice tone="error"><p>{error}</p></Notice>}
      <form className="acct_form" onSubmit={f.handleSubmit} noValidate>
        <Field label="Email address" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={EMAIL_MAX} value={f.values.email} onChange={change} onBlur={f.handleBlur} error={(f.touched.email && f.errors.email) || undefined} disabled={f.isSubmitting} />
        <SubmitButton busy={f.isSubmitting} disabled={cooldown.remaining > 0}>
          {f.isSubmitting ? "Sending…" : cooldown.remaining > 0 ? `Send again in ${cooldown.remaining}s` : "Send reset link"}
        </SubmitButton>
      </form>
      <p className="acct_foot">
        <button type="button" className="acct_inline is_strong" onClick={back} disabled={f.isSubmitting}>{user ? "Cancel" : "Back to login"}</button>
      </p>
    </AuthModalLayout>
  );
}
