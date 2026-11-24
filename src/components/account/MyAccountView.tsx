"use client";

// My Account: only for logged-in customers with a VERIFIED email (others are sent to Login / verification).
// Profile data comes from the boutique API, which trusts only the verified Firebase ID token.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth, type CustomerProfile } from "./AuthProvider";
import { AccountHeading, AccountPage, Field, LoadingCard, NotConfigured, Notice, SubmitButton } from "./ui";
import { NAME_MAX, nameError } from "@/lib/customerAuth/rules";

const schema = Yup.object({ name: Yup.string().test("rule", (v, ctx) => { const m = nameError(v); return m ? ctx.createError({ message: m }) : true; }) });

export default function MyAccountView() {
  const { configured, loading, user, verified, authFetch, updateName, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState("");
  const [leaving, setLeaving] = useState(false);
  const saving = useRef(false);

  // Route protection (client side; the API independently refuses anything without a verified token).
  useEffect(() => {
    if (loading || leaving) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent("/my-account")}`);
    else if (!verified) router.replace("/verify-email");
  }, [loading, user, verified, leaving, router]);

  useEffect(() => {
    if (!user || !verified) return;
    let cancelled = false;
    authFetch("/api/customer/me")
      .then(async (r) => { const b = await r.json().catch(() => null); if (!r.ok) throw new Error(b?.message ?? "Could not load your account."); return b.data as CustomerProfile; })
      .then((p) => { if (!cancelled) { setProfile(p); setLoadError(""); } })
      .catch((e) => { if (!cancelled) setLoadError(e instanceof Error ? e.message : "Could not load your account."); });
    return () => { cancelled = true; };
  }, [user, verified, authFetch]);

  const f = useFormik({
    initialValues: { name: "" },
    validationSchema: schema,
    onSubmit: async (v, helpers) => {
      if (saving.current) return;
      saving.current = true;
      setSaved("");
      try {
        const p = await updateName(v.name);
        setProfile(p);
        setEditing(false);
        setSaved("Your profile was saved.");
      } catch (e) {
        helpers.setFieldError("name", e instanceof Error ? e.message : "Could not save your profile.");
      } finally { saving.current = false; }
    },
  });

  if (!configured) return <AccountPage><AccountHeading eyebrow="Your account" title="My Account" /><NotConfigured /></AccountPage>;
  if (loading || !user || !verified) return <AccountPage><LoadingCard /></AccountPage>;

  const name = profile?.name || user.displayName || "";
  const out = async () => { setLeaving(true); await logout().catch(() => undefined); router.replace("/login"); };

  return (
    <AccountPage wide>
      <AccountHeading eyebrow="My Account" title={name ? `Hello, ${name.split(" ")[0]}` : "My Account"} lead="Your Sara Royal Boutique account. You can keep ordering on WhatsApp exactly as before." />
      {loadError && <Notice tone="error"><p>{loadError}</p></Notice>}
      {saved && <Notice tone="success"><p>{saved}</p></Notice>}
      <dl className="acct_profile">
        <dt>Name</dt><dd>{name || "—"}</dd>
        <dt>Email</dt><dd>{user.email} <span className="acct_badge">✓ Verified</span></dd>
      </dl>

      {editing ? (
        <form className="acct_form" onSubmit={f.handleSubmit} noValidate>
          <h2 className="acct_section_title">Edit profile</h2>
          <Field label="Full name" name="name" autoComplete="name" maxLength={NAME_MAX} value={f.values.name} onChange={f.handleChange} onBlur={f.handleBlur} error={(f.touched.name && f.errors.name) || undefined} disabled={f.isSubmitting} />
          <SubmitButton busy={f.isSubmitting}>{f.isSubmitting ? "Saving…" : "Save changes"}</SubmitButton>
          <button type="button" className="acct_btn is_block" onClick={() => setEditing(false)} disabled={f.isSubmitting}>Cancel</button>
        </form>
      ) : (
        <div className="acct_actions">
          <button type="button" className="acct_btn is_block" onClick={() => { f.resetForm({ values: { name } }); setSaved(""); setEditing(true); }} disabled={!profile}>Edit profile</button>
          <Link href="/forgot-password" className="acct_btn is_block">Change password</Link>
          <Link href="/collections" className="acct_btn is_block">Continue shopping</Link>
        </div>
      )}
      <hr className="acct_divider" />
      <button type="button" className="acct_btn is_solid is_block" onClick={out} disabled={leaving} aria-busy={leaving || undefined}>
        {leaving && <span className="acct_spinner" aria-hidden="true" />} Log out
      </button>
    </AccountPage>
  );
}
