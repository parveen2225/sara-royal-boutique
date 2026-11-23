"use client";

import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import CommonTable from "@/components/common/ui/CommonTable/CommonTable";
import { errorMessage } from "@/lib/api/suitsApi";
import { auditApi, type AuditPage } from "@/lib/api/adminApi";
import "@/components/admin/suits/suits.scss";
import PageHeader from "@/components/admin/ui/PageHeader";
import EmptyState from "@/components/admin/ui/EmptyState";

const FIELDS = [{ label: "When", key: "w" }, { label: "Who", key: "who" }, { label: "Action", key: "a" }, { label: "Details", key: "d" }];
const GROUPS = ["", "order.", "return.", "refund.", "invoice.", "suit.", "staff.", "settings.", "report.", "auth.", "maintenance."];

export default function AuditPage() {
  const [f, setF] = useState({ action: "", actor: "", from: "", to: "", limit: 50 });
  const [dActor, setDActor] = useState(""); const [page, setPage] = useState(1);
  const [res, setRes] = useState<AuditPage | null>(null); const [error, setError] = useState("");
  useEffect(() => { const t = setTimeout(() => setDActor(f.actor), 300); return () => clearTimeout(t); }, [f.actor]);
  useEffect(() => {
    let cancelled = false;
    auditApi.list({ action: f.action, actor: dActor, from: f.from, to: f.to, limit: f.limit, page }).then((r) => { if (!cancelled) { setRes(r); setError(""); } }).catch((e) => !cancelled && setError(errorMessage(e)));
    return () => { cancelled = true; };
  }, [f.action, dActor, f.from, f.to, f.limit, page]);
  const set = (k: string, v: string | number) => { setPage(1); setF((x) => ({ ...x, [k]: v })); };
  return (
    <section>
      <PageHeader title="Audit Logs" count={res ? res.total : null} subtitle="A permanent record of sensitive actions: who did what, and when. Passwords and secrets are never recorded." />
      {error && <div className="admin_error_banner mb-3" role="alert">{error}</div>}
      <div className="admin_suit_filters">
        <Form.Select aria-label="Action group" value={f.action} onChange={(e) => set("action", e.target.value)}>{GROUPS.map((g) => <option key={g} value={g}>{g ? `${g}*` : "All actions"}</option>)}</Form.Select>
        <Form.Control aria-label="Who (email)" placeholder="Who (email)" value={f.actor} onChange={(e) => { setPage(1); setF({ ...f, actor: e.target.value }); }} />
        <Form.Control aria-label="From date" type="date" value={f.from} onChange={(e) => set("from", e.target.value)} />
        <Form.Control aria-label="To date" type="date" value={f.to} onChange={(e) => set("to", e.target.value)} />
        <Form.Select aria-label="Rows per page" value={f.limit} onChange={(e) => set("limit", Number(e.target.value))}><option value={20}>20 per page</option><option value={50}>50 per page</option><option value={100}>100 per page</option></Form.Select>
      </div>
      <CommonTable key={`${f.action}|${dActor}|${f.from}|${f.to}|${f.limit}`} fields={FIELDS} loader={!res && !error} lastColumnWidth="auto" pagination={(res?.pages ?? 1) > 1} totalPages={res?.pages ?? 1} totalDocs={res?.total ?? 0} onPageChange={({ selected }) => setPage(selected + 1)}
        empty={f.action || f.actor || f.from || f.to
          ? <EmptyState icon="search" title="No Matching Results" text="Try adjusting your search or filters." action={<button type="button" className="admin_outline_btn" onClick={() => { setPage(1); setF((x) => ({ ...x, action: "", actor: "", from: "", to: "" })); }}>Clear Filters</button>} />
          : <EmptyState icon="shield" title="No Activity Yet" text="Sensitive actions such as price, stock, refund and staff changes will be recorded here." />}>
        {(res?.items ?? []).map((a) => (
          <tr key={a.id}>
            <td style={{ whiteSpace: "nowrap" }}>{new Date(a.at).toLocaleString("en-IN")}</td>
            <td>{a.actorEmail}<small className="d-block text-muted">{a.actorRole}</small></td>
            <td><code>{a.action}</code></td>
            <td>{a.summary}{a.entityType && <small className="d-block text-muted">{a.entityType} {a.entityId}</small>}</td>
          </tr>
        ))}
      </CommonTable>
    </section>
  );
}
