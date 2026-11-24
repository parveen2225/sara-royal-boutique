"use client";

// My Account: only for logged-in customers with a VERIFIED email. Logged-out visitors (or unverified ones) get the auth
// modal opened over a locked placeholder instead of being sent to a separate page.
// Profile data comes from the boutique API, which trusts only the verified Firebase ID token.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth, type CustomerProfile } from "./AuthProvider";
import AuthModal from "./AuthModal";
import type { AuthView } from "./authModalContext";
import { BagIcon, CalendarIcon, CheckIcon, EditIcon, KeyIcon, LockIcon, LogoutIcon, MailIcon, ShieldIcon, UserIcon } from "./icons";
import { AccountPage, Field, LoadingCard, NotConfigured, Notice, SubmitButton } from "./ui";
import { NAME_MAX, nameError } from "@/lib/customerAuth/rules";

const schema = Yup.object({ name: Yup.string().test("rule", (v, ctx) => { const m = nameError(v); return m ? ctx.createError({ message: m }) : true; }) });

const initialsOf = (name: string, email: string) => {
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => Array.from(w)[0]).join("");
  return (letters || Array.from(email)[0] || "S").toUpperCase();
};
const memberSince = (iso?: string) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "";
};

export default function MyAccountView() {
  const { configured, loading, user, verified, authFetch, updateName, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [dismissed, setDismissed] = useState(false); // the visitor closed the login modal on the locked page
  const [manual, setManual] = useState<AuthView | null>(null); // opened on purpose (e.g. "Change password")
  const [modalKey, setModalKey] = useState(0);
  const saving = useRef(false);

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

  const needsAuth = configured && !loading && !leaving && (!user || !verified);
  const open = manual !== null || (needsAuth && !dismissed);
  const openModal = (view: AuthView) => { setModalKey((k) => k + 1); setManual(view); setDismissed(false); };
  const closeModal = () => { setManual(null); setDismissed(true); };

  // Route protection is the modal itself (client side); the API independently refuses anything without a verified token.
  const modal = configured ? (
    <AuthModal key={modalKey} open={open} initialView={manual ?? "login"} initialEmail={manual === "forgot" ? user?.email ?? "" : ""} next="/my-account" onClose={closeModal} onAuthenticated={closeModal} />
  ) : null;

  let content;
  if (!configured) {
    content = <AccountPage><NotConfigured /></AccountPage>;
  } else if (loading || leaving) {
    content = <AccountPage><LoadingCard /></AccountPage>;
  } else if (!user || !verified) {
    content = (
      <AccountPage>
        <div className="acct_locked">
          <span className="acct_locked_icon"><LockIcon size={26} /></span>
          <p className="acct_eyebrow">My Account</p>
          <h1 className="acct_title">Please log in to continue</h1>
          <p className="acct_lead">Your profile and account details are private. Log in or create an account to view them. You can keep shopping and ordering on WhatsApp without one.</p>
          <div className="acct_actions">
            <button type="button" className="acct_btn is_solid is_block" onClick={() => openModal("login")}>Log in</button>
            <button type="button" className="acct_btn is_block" onClick={() => openModal("signup")}>Create an account</button>
          </div>
        </div>
      </AccountPage>
    );
  } else {
    const name = profile?.name || user.displayName || "";
    const first = name.split(/\s+/)[0] ?? "";
    const since = memberSince(profile?.createdAt);
    const out = async () => { setLeaving(true); await logout().catch(() => undefined); router.replace("/"); };

    content = (
      <main className="acct_page acct_account">
        <div className="container">
          <section className="acct_hero">
            <div className="acct_avatar" aria-hidden="true"><span>{initialsOf(name, user.email ?? "")}</span></div>
            <div className="acct_hero_text">
              <p className="acct_eyebrow">My Account</p>
              <h1 className="acct_hello">{first ? <>Hello, <em>{first}</em></> : "Hello"}</h1>
              <p className="acct_hero_sub">Welcome to your Sara Royal Boutique account. You can keep ordering on WhatsApp exactly as before.</p>
              <span className="acct_badge"><CheckIcon size={13} /> Email verified</span>
            </div>
            <div className="acct_hero_actions">
              <Link href="/collections" className="acct_btn is_solid"><BagIcon size={17} /> Continue shopping</Link>
              <button type="button" className="acct_btn" onClick={out} disabled={leaving} aria-busy={leaving || undefined}>
                {leaving ? <span className="acct_spinner" aria-hidden="true" /> : <LogoutIcon size={17} />} Log out
              </button>
            </div>
          </section>

          {loadError && <Notice tone="error"><p>{loadError}</p></Notice>}
          {saved && <Notice tone="success"><p>{saved}</p></Notice>}

          <div className="acct_grid">
            <section className="acct_panel" aria-labelledby="acct-profile-title">
              <header className="acct_panel_head">
                <span className="acct_panel_icon"><UserIcon size={20} /></span>
                <div><h2 id="acct-profile-title">Profile details</h2><p>How you appear at the boutique</p></div>
                {!editing && (
                  <button type="button" className="acct_btn is_small" onClick={() => { f.resetForm({ values: { name } }); setSaved(""); setEditing(true); }} disabled={!profile}>
                    <EditIcon size={15} /> Edit profile
                  </button>
                )}
              </header>
              {editing ? (
                <form className="acct_form" onSubmit={f.handleSubmit} noValidate>
                  <Field label="Full name" name="name" autoComplete="name" maxLength={NAME_MAX} value={f.values.name} onChange={f.handleChange} onBlur={f.handleBlur} error={(f.touched.name && f.errors.name) || undefined} disabled={f.isSubmitting} />
                  <div className="acct_actions is_inline">
                    <SubmitButton busy={f.isSubmitting}>{f.isSubmitting ? "Saving…" : "Save changes"}</SubmitButton>
                    <button type="button" className="acct_btn is_block" onClick={() => setEditing(false)} disabled={f.isSubmitting}>Cancel</button>
                  </div>
                </form>
              ) : (
                <dl className="acct_rows">
                  <div><dt><UserIcon size={15} /> Name</dt><dd>{name || "—"}</dd></div>
                  <div><dt><MailIcon size={15} /> Email</dt><dd>{user.email} <span className="acct_badge is_soft"><CheckIcon size={12} /> Verified</span></dd></div>
                  {since && <div><dt><CalendarIcon size={15} /> Member since</dt><dd>{since}</dd></div>}
                </dl>
              )}
            </section>

            <section className="acct_panel" aria-labelledby="acct-security-title">
              <header className="acct_panel_head">
                <span className="acct_panel_icon"><ShieldIcon size={20} /></span>
                <div><h2 id="acct-security-title">Sign-in &amp; security</h2><p>Keep your account safe</p></div>
              </header>
              <dl className="acct_rows">
                <div><dt><MailIcon size={15} /> Sign-in method</dt><dd>Email and password</dd></div>
                <div><dt><ShieldIcon size={15} /> Email status</dt><dd>Verified</dd></div>
              </dl>
              <button type="button" className="acct_btn is_block" onClick={() => openModal("forgot")}><KeyIcon size={17} /> Change password</button>
              <p className="acct_hint_text">We will email you a secure link to choose a new password.</p>
            </section>
          </div>
        </div>
      </main>
    );
  }

  return <>{content}{modal}</>;
}
