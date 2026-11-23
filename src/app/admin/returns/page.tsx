"use client";

import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import CommonTable from "@/components/common/ui/CommonTable/CommonTable";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import PageHeader from "@/components/admin/ui/PageHeader";
import EmptyState from "@/components/admin/ui/EmptyState";
import AdminIcon from "@/components/admin/ui/AdminIcon";
import { errorMessage } from "@/lib/api/suitsApi";
import { returnsApi, type Paged, type ReturnRow } from "@/lib/api/returnsApi";
import "@/components/admin/suits/suits.scss";

const FIELDS = [
  { label: "Return", key: "r" }, { label: "Order", key: "o" }, { label: "Items", key: "i" }, { label: "Reason", key: "re" }, { label: "Decision", key: "s" }, { label: "Actions", key: "a" },
];
const REASON = { preference: "Customer preference", wrong_item: "Wrong item", defective: "Defective" } as const;

export default function ReturnsPage() {
  const [q, setQ] = useState(""); const [dq, setDq] = useState(""); const [status, setStatus] = useState(""); const [page, setPage] = useState(1);
  const [res, setRes] = useState<Paged<ReturnRow> | null>(null); const [error, setError] = useState("");
  const filtersActive = Boolean(q || status);
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    let cancelled = false;
    returnsApi.list({ q: dq, status, page, limit: 20 }).then((r) => { if (!cancelled) { setRes(r); setError(""); } }).catch((e) => !cancelled && setError(errorMessage(e)));
    return () => { cancelled = true; };
  }, [dq, status, page]);
  const clear = () => { setPage(1); setQ(""); setDq(""); setStatus(""); };
  const record = <CommonButton role="link" to="/admin/returns/new" className="admin_primary_btn" svgIcon={<AdminIcon name="plus" size={16} />}>Record Return</CommonButton>;

  return (
    <section>
      <PageHeader
        title="Returns & Exchanges"
        count={res?.total ?? null}
        subtitle="Customers ask on WhatsApp; record the request here. Standard window: 3 days after delivery. Stock returns to the shelf only after receipt, inspection and a resellable result."
        actions={record}
      />
      {error && <div className="admin_error_banner" role="alert"><AdminIcon name="alert" size={16} />{error}</div>}
      <div className="ad_toolbar" role="search">
        <label className="ad_search"><AdminIcon name="search" size={16} /><Form.Control aria-label="Search returns" placeholder="Return ID, order ID or SKU" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} /></label>
        <Form.Select aria-label="Decision" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}><option value="">All decisions</option><option value="pending">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></Form.Select>
        {filtersActive && <button type="button" className="admin_outline_btn admin_sm_btn ad_toolbar_btn" onClick={clear}><AdminIcon name="x" size={14} />Clear</button>}
      </div>
      <CommonTable
        key={`${dq}|${status}`}
        fields={FIELDS}
        loader={!res && !error}
        mobileCards
        pagination={(res?.pages ?? 1) > 1}
        totalPages={res?.pages ?? 1}
        totalDocs={res?.total ?? 0}
        onPageChange={({ selected }) => setPage(selected + 1)}
        empty={filtersActive
          ? <EmptyState icon="search" title="No Matching Returns" text="No returns fit those filters." action={<button type="button" className="admin_outline_btn" onClick={clear}>Clear filters</button>} />
          : <EmptyState icon="undo" title="No Returns Recorded Yet" text="When a customer asks to return or exchange a delivered suit, record it here. Each request is checked against the 3-day window and the unused/uncut or evidence rules." action={record} />}
      >
        {(res?.items ?? []).map((r) => (
          <tr key={r.id} className={r.decision.status === "pending" ? "is_attention" : ""}>
            <td><strong>{r.returnId}</strong><small className="d-block">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {r.type}</small></td>
            <td>{r.orderId}</td>
            <td>{r.items.map((i) => `${i.sku} ×${i.quantity}`).join(", ")}</td>
            <td>{REASON[r.reasonType]}{!r.withinWindow && <small className="d-block">outside window (exception)</small>}</td>
            <td><span className={`admin_pill ${r.decision.status}`}>{r.decision.status === "pending" ? "Pending review" : r.decision.status}</span>{r.restocked && <> <span className="admin_pill resellable">restocked</span></>}</td>
            <td className="ad_actions_cell"><CommonButton role="link" to={`/admin/returns/${r.id}`} className="admin_outline_btn admin_sm_btn">{r.decision.status === "pending" ? "Review" : "View"}</CommonButton></td>
          </tr>
        ))}
      </CommonTable>
    </section>
  );
}
