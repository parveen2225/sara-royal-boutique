"use client";

import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import CommonTable from "@/components/common/ui/CommonTable/CommonTable";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import PageHeader from "@/components/admin/ui/PageHeader";
import EmptyState from "@/components/admin/ui/EmptyState";
import AdminIcon from "@/components/admin/ui/AdminIcon";
import { useCurrentAdmin } from "@/lib/admin/useCurrentAdmin";
import { errorMessage } from "@/lib/api/suitsApi";
import { refundsApi, type Paged, type RefundRow } from "@/lib/api/returnsApi";
import { formatInrPaise } from "@/lib/money";
import "@/components/admin/suits/suits.scss";

const FIELDS = [
  { label: "Refund", key: "r" }, { label: "Order", key: "o" }, { label: "Amount", key: "a" }, { label: "Method", key: "m" }, { label: "Approval", key: "ap" }, { label: "Payment", key: "p" }, { label: "Actions", key: "x" },
];
const APPROVAL_LABEL = { recommended: "Awaiting approval", approved: "Approved", rejected: "Rejected" } as const;
const PAYMENT_LABEL = { pending: "Pending payment", processing: "Processing", completed: "Completed", failed: "Failed" } as const;

export default function RefundsPage() {
  const { user } = useCurrentAdmin();
  const isOwner = user?.role === "owner";
  const [q, setQ] = useState(""); const [dq, setDq] = useState(""); const [status, setStatus] = useState(""); const [approval, setApproval] = useState(""); const [page, setPage] = useState(1);
  const [res, setRes] = useState<Paged<RefundRow> | null>(null); const [error, setError] = useState("");
  const [awaiting, setAwaiting] = useState(0);
  const filtersActive = Boolean(q || status || approval);

  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    let cancelled = false;
    refundsApi.list({ q: dq, status, approval, page, limit: 20 }).then((r) => { if (!cancelled) { setRes(r); setError(""); } }).catch((e) => !cancelled && setError(errorMessage(e)));
    return () => { cancelled = true; };
  }, [dq, status, approval, page]);
  useEffect(() => {
    let cancelled = false;
    refundsApi.list({ approval: "recommended", limit: 10 }).then((r) => !cancelled && setAwaiting(r.total)).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const clear = () => { setPage(1); setQ(""); setDq(""); setStatus(""); setApproval(""); };

  return (
    <section>
      <PageHeader
        title="Refunds"
        count={res?.total ?? null}
        subtitle="Refunds are paid manually by UPI or bank transfer. Staff can recommend a refund; only the Owner can approve it and record the payment."
      />
      {error && <div className="admin_error_banner" role="alert"><AdminIcon name="alert" size={16} />{error}</div>}
      {isOwner && awaiting > 0 && approval !== "recommended" && (
        <div className="ad_callout" role="status">
          <AdminIcon name="clock" size={18} />
          <span><strong>{awaiting} {awaiting === 1 ? "refund is" : "refunds are"} waiting for your approval.</strong> Nothing is paid until you approve it and record the payment.</span>
          <button type="button" className="admin_outline_btn admin_sm_btn" onClick={() => { setPage(1); setApproval("recommended"); }}>Review now</button>
        </div>
      )}
      <div className="ad_toolbar" role="search">
        <label className="ad_search"><AdminIcon name="search" size={16} /><Form.Control aria-label="Search refunds" placeholder="Refund, order, return ID or UTR" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} /></label>
        <Form.Select aria-label="Approval" value={approval} onChange={(e) => { setPage(1); setApproval(e.target.value); }}><option value="">Any approval</option><option value="recommended">Awaiting approval</option><option value="approved">Approved</option><option value="rejected">Rejected</option></Form.Select>
        <Form.Select aria-label="Payment status" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}><option value="">Any payment status</option><option value="pending">Pending payment</option><option value="processing">Processing</option><option value="completed">Completed</option><option value="failed">Failed</option></Form.Select>
        {filtersActive && <button type="button" className="admin_outline_btn admin_sm_btn ad_toolbar_btn" onClick={clear}><AdminIcon name="x" size={14} />Clear</button>}
      </div>
      <CommonTable
        key={`${dq}|${status}|${approval}`}
        fields={FIELDS}
        loader={!res && !error}
        mobileCards
        pagination={(res?.pages ?? 1) > 1}
        totalPages={res?.pages ?? 1}
        totalDocs={res?.total ?? 0}
        onPageChange={({ selected }) => setPage(selected + 1)}
        empty={filtersActive
          ? <EmptyState icon="search" title="No Matching Refunds" text="No refunds fit those filters." action={<button type="button" className="admin_outline_btn" onClick={clear}>Clear filters</button>} />
          : <EmptyState icon="wallet" title="No Refunds Yet" text="A refund starts from a delivered order or an approved return: staff recommend an amount, then the Owner approves it and records the payment with its UTR." />}
      >
        {(res?.items ?? []).map((r) => (
          <tr key={r.id} className={r.approval.status === "recommended" ? "is_attention" : ""}>
            <td><strong>{r.refundId}</strong><small className="d-block">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}{r.returnId ? ` · ${r.returnId}` : ""}</small></td>
            <td>{r.orderId}</td>
            <td><span className="ad_num">{formatInrPaise(r.amountPaise)}</span></td>
            <td>{r.method === "upi" ? "UPI" : "Bank transfer"}</td>
            <td><span className={`admin_pill ${r.approval.status}`}>{APPROVAL_LABEL[r.approval.status]}</span></td>
            <td>{r.approval.status === "rejected" ? <span className="text-muted">—</span> : <span className={`admin_pill ${r.status}`}>{PAYMENT_LABEL[r.status]}</span>}{r.utr && <small className="d-block">{r.utr}</small>}</td>
            <td className="ad_actions_cell"><CommonButton role="link" to={`/admin/refunds/${r.id}`} className="admin_outline_btn admin_sm_btn">{isOwner && r.approval.status === "recommended" ? "Review" : "View"}</CommonButton></td>
          </tr>
        ))}
      </CommonTable>
    </section>
  );
}
