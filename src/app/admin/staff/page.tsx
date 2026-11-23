"use client";

import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import CommonModal from "@/components/common/Modal/CommonModal";
import { errorMessage } from "@/lib/api/suitsApi";
import { staffApi, type StaffRow } from "@/lib/api/adminApi";
import "@/components/admin/suits/suits.scss";
import PageHeader from "@/components/admin/ui/PageHeader";

const PERMS = [
  { key: "products", label: "Products", hint: "Suits, categories, images" },
  { key: "orders", label: "Orders", hint: "Create/manage orders, invoices" },
  { key: "stock", label: "Stock", hint: "Adjust stock; restock returns" },
  { key: "returns", label: "Returns", hint: "Returns, exchanges; recommend refunds" },
  { key: "reports", label: "Reports", hint: "Dashboard and exports" },
] as const;
type Perms = Record<(typeof PERMS)[number]["key"], boolean>;
const NONE: Perms = { products: false, orders: false, stock: false, returns: false, reports: false };
type Dialog = null | { kind: "create" } | { kind: "perms"; row: StaffRow } | { kind: "password"; row: StaffRow };

export default function StaffPage() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null); const [dErr, setDErr] = useState("");
  const [f, setF] = useState({ name: "", email: "", password: "", perms: NONE as Perms });

  useEffect(() => {
    let cancelled = false;
    staffApi.list().then((r) => !cancelled && setRows(r)).catch((e) => !cancelled && setError(errorMessage(e)));
    return () => { cancelled = true; };
  }, [tick]);

  const open = (d: Dialog) => { setDErr(""); setF({ name: d && "row" in d ? d.row.name : "", email: "", password: "", perms: d && d.kind === "perms" ? { ...d.row.permissions } : NONE }); setDialog(d); };
  const run = async (fn: () => Promise<unknown>, ok: string, inDialog = false) => {
    setError(""); setNotice(""); setDErr("");
    try { await fn(); setNotice(ok); if (inDialog) setDialog(null); setTick((t) => t + 1); } catch (e) { if (inDialog) setDErr(errorMessage(e)); else setError(errorMessage(e)); }
  };
  const permCheckboxes = (
    <div className="admin_chip_list mb-2">
      {PERMS.map((p) => (
        <label key={p.key} className={`admin_chip_check ${f.perms[p.key] ? "is_on" : ""}`} title={p.hint}>
          <input type="checkbox" checked={f.perms[p.key]} onChange={(e) => setF({ ...f, perms: { ...f.perms, [p.key]: e.target.checked } })} />{p.label}
        </label>
      ))}
    </div>
  );

  return (
    <section>
      <PageHeader title="Staff" subtitle="Each staff member signs in with their own login. You choose exactly what they may do; the server enforces it on every request. Staff can never approve or complete refunds, change settings, manage staff or delete suits permanently." actions={<CommonButton className="admin_primary_btn" onClick={() => open({ kind: "create" })}>+ Add staff</CommonButton>} />
      {error && <div className="admin_error_banner mb-3" role="alert">{error}</div>}
      {notice && <div className="admin_success_banner" role="status">{notice}</div>}
      <div className="admin_card admin_card_pad" style={{ overflowX: "auto" }}>
        <table className="admin_history_table">
          <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Can access</th><th>Last sign-in</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.name}</strong></td><td>{r.email}</td>
                <td><span className={`admin_pill ${r.role === "owner" ? "featured" : r.active ? "published" : "archived"}`}>{r.role === "owner" ? "Owner" : r.active ? "Active" : "Disabled"}</span></td>
                <td>{r.role === "owner" ? "Everything" : PERMS.filter((p) => r.permissions[p.key]).map((p) => p.label).join(", ") || <span className="text-muted">Nothing</span>}</td>
                <td>{r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString("en-IN") : "Never"}</td>
                <td>{r.role === "staff" && (
                  <div className="admin_row_actions">
                    <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => open({ kind: "perms", row: r })}>Edit access</CommonButton>
                    <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => open({ kind: "password", row: r })}>Reset password</CommonButton>
                    <CommonButton className={`${r.active ? "admin_danger_btn" : "admin_outline_btn"} admin_sm_btn`} onClick={() => run(() => staffApi.update(r.id, { active: !r.active }), r.active ? `${r.name} disabled and signed out.` : `${r.name} enabled.`)}>{r.active ? "Disable" : "Enable"}</CommonButton>
                  </div>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialog && (
        <CommonModal show handleClose={() => setDialog(null)} backdrop="static" className="admin_delete_confirm_modal" heading={dialog.kind === "create" ? "Add staff member" : dialog.kind === "perms" ? `Access for ${dialog.row.name}` : `Reset password for ${dialog.row.name}`}>
          {dErr && <div className="admin_error_banner mb-2" role="alert">{dErr}</div>}
          <Form className="admin_form" onSubmit={(e) => e.preventDefault()}>
            {dialog.kind === "create" && (<>
              <Form.Label htmlFor="s-name">Name</Form.Label><Form.Control id="s-name" value={f.name} maxLength={120} onChange={(e) => setF({ ...f, name: e.target.value })} className="mb-2" />
              <Form.Label htmlFor="s-email">Email (their login)</Form.Label><Form.Control id="s-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="mb-2" />
              <Form.Label htmlFor="s-pw">Password (at least 12 characters)</Form.Label><Form.Control id="s-pw" type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className="mb-2" />
            </>)}
            {dialog.kind === "password" && (<><p className="small text-muted">They are signed out everywhere and must use the new password.</p><Form.Label htmlFor="s-pw2">New password (at least 12 characters)</Form.Label><Form.Control id="s-pw2" type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className="mb-2" /></>)}
            {dialog.kind !== "password" && (<><Form.Label>Can access</Form.Label>{permCheckboxes}</>)}
            <div className="admin_delete_confirm_actions">
              <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => setDialog(null)}>Close</CommonButton>
              <CommonButton className="admin_primary_btn admin_sm_btn" onClick={() => {
                if (dialog.kind === "create") run(() => staffApi.create({ name: f.name, email: f.email, password: f.password, permissions: f.perms }), "Staff account created.", true);
                else if (dialog.kind === "perms") run(() => staffApi.update(dialog.row.id, { permissions: f.perms }), "Access updated; it applies immediately.", true);
                else run(() => staffApi.update(dialog.row.id, { newPassword: f.password }), "Password reset and sessions signed out.", true);
              }}>Save</CommonButton>
            </div>
          </Form>
        </CommonModal>
      )}
    </section>
  );
}
