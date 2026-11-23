"use client";

import { useState } from "react";
import { Form } from "react-bootstrap";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { apiJson } from "@/lib/api/client";
import { useCurrentAdmin } from "@/lib/admin/useCurrentAdmin";
import { errorMessage } from "@/lib/api/suitsApi";
import "@/components/admin/suits/suits.scss";
import PageHeader from "@/components/admin/ui/PageHeader";

export default function AccountPage() {
  const { user } = useCurrentAdmin();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setDone(false);
    if (next.length < 12) return setError("New password must be at least 12 characters.");
    if (next !== confirm) return setError("New password and confirmation do not match.");
    if (next === current) return setError("New password must be different from the current one.");
    setSaving(true);
    try {
      await apiJson("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword: current, newPassword: next }) });
      setDone(true);
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err) {
      setError(errorMessage(err, "Could not change the password."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <PageHeader title="My Account" subtitle={user ? <>Signed in as <strong>{user.email}</strong> ({user.role === "owner" ? "Owner / Admin" : "Staff"})</> : undefined} />
      <div className="admin_card" style={{ padding: "1.25rem", maxWidth: 520 }}>
        <h5 className="mb-3">Change password</h5>
        {error && <div className="admin_error_banner mb-3" role="alert">{error}</div>}
        {done && <div className="admin_success_banner" role="status">Password updated. Use it the next time you sign in.</div>}
        <Form className="admin_form" onSubmit={submit} noValidate>
          <Form.Label htmlFor="pw-current">Current password</Form.Label>
          <Form.Control id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className="mb-3" />
          <Form.Label htmlFor="pw-new">New password (at least 12 characters)</Form.Label>
          <Form.Control id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className="mb-3" />
          <Form.Label htmlFor="pw-confirm">Confirm new password</Form.Label>
          <Form.Control id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mb-3" />
          <CommonButton type="submit" className="admin_primary_btn" disabled={saving} isLoading={saving}>Update password</CommonButton>
        </Form>
      </div>
    </section>
  );
}
