"use client";

import { use, useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import CommonModal from "@/components/common/Modal/CommonModal";
import { useCurrentAdmin } from "@/lib/admin/useCurrentAdmin";
import { errorMessage } from "@/lib/api/suitsApi";
import { refundsApi, type RefundRow } from "@/lib/api/returnsApi";
import { formatInrPaise } from "@/lib/money";
import "@/components/admin/suits/suits.scss";
import PageHeader from "@/components/admin/ui/PageHeader";

type Dialog = null | "approve" | "reject" | "complete" | "fail";
const when = (d?: string) => (d ? new Date(d).toLocaleString("en-IN") : "—");

export default function RefundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useCurrentAdmin();
  const [r, setR] = useState<RefundRow | null>(null);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [tick, setTick] = useState(0);
  const [dialog, setDialog] = useState<Dialog>(null); const [dErr, setDErr] = useState("");
  const [f, setF] = useState({ amount: "", note: "", utr: "", date: "" });

  useEffect(() => {
    let cancelled = false;
    refundsApi.get(id).then((x) => !cancelled && setR(x)).catch((e) => !cancelled && setError(errorMessage(e)));
    return () => { cancelled = true; };
  }, [id, tick]);
  if (error && !r) return <div className="admin_error_banner" role="alert">{error}</div>;
  if (!r) return null;
  const isOwner = user?.role === "owner";
  const open = (d: Dialog) => { setDErr(""); setF({ amount: String(r.amountPaise / 100), note: "", utr: "", date: "" }); setDialog(d); };
  const act = async (body: Record<string, unknown>, ok: string, inDialog = false) => {
    setError(""); setNotice(""); setDErr("");
    try { await refundsApi.act(r.id, body); setNotice(ok); if (inDialog) setDialog(null); setTick((t) => t + 1); } catch (e) { if (inDialog) setDErr(errorMessage(e)); else setError(errorMessage(e)); }
  };
  const awaiting = r.approval.status === "recommended";
  const payable = r.approval.status === "approved" && (r.status === "pending" || r.status === "processing");

  return (
    <section>
      <PageHeader title={r.refundId} subtitle={<span className="ad_pill_row"><span className={`admin_pill ${r.approval.status}`}>{r.approval.status}</span><span className={`admin_pill ${r.status}`}>{r.status}</span></span>} actions={<CommonButton role="link" to="/admin/refunds" className="admin_outline_btn">All refunds</CommonButton>} />
      {error && <div className="admin_error_banner mb-3" role="alert">{error}</div>}
      {notice && <div className="admin_success_banner" role="status">{notice}</div>}

      <div className="admin_card admin_card_pad mb-3">
        {isOwner ? (
          <div className="admin_row_actions">
            {awaiting && <><CommonButton className="admin_primary_btn admin_sm_btn" onClick={() => open("approve")}>Approve amount…</CommonButton><CommonButton className="admin_danger_btn admin_sm_btn" onClick={() => open("reject")}>Reject…</CommonButton></>}
            {r.approval.status === "approved" && r.status === "pending" && <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => act({ action: "process" }, "Marked as processing.")}>Mark processing</CommonButton>}
            {payable && <><CommonButton className="admin_primary_btn admin_sm_btn" onClick={() => open("complete")}>Mark payment completed…</CommonButton><CommonButton className="admin_danger_btn admin_sm_btn" onClick={() => open("fail")}>Mark failed…</CommonButton></>}
            {!awaiting && !payable && <small className="text-muted">No further action: this refund is {r.approval.status === "rejected" ? "rejected" : r.status}.</small>}
          </div>
        ) : (
          <p className="mb-0 small">Only the Owner can approve this refund or record its payment. {awaiting ? "It is waiting for the Owner’s approval." : ""}</p>
        )}
      </div>

      <div className="admin_two_col">
        <div className="admin_card admin_card_pad">
          <h6>Details</h6>
          <dl className="admin_kv">
            <dt>Order</dt><dd><a href={`/admin/orders/${r.orderRef}`}>{r.orderId}</a>{r.returnId && <> · return {r.returnId}</>}</dd>
            <dt>Amount</dt><dd><strong>{formatInrPaise(r.amountPaise)}</strong>{awaiting && " (proposed)"}</dd>
            <dt>Method</dt><dd>{r.method === "upi" ? "UPI" : "Bank transfer"}</dd>
            <dt>Recommended by</dt><dd>{r.recommendedByEmail}</dd>
            <dt>Approval</dt><dd>{r.approval.status}{r.approval.byEmail ? ` by ${r.approval.byEmail} · ${when(r.approval.at)}` : ""}{r.approval.note ? ` — ${r.approval.note}` : ""}</dd>
            <dt>UTR / reference</dt><dd>{r.utr || "—"}</dd>
            <dt>Refund date</dt><dd>{when(r.refundDate)}</dd>
            <dt>Notes</dt><dd>{r.notes || "—"}</dd>
          </dl>
        </div>
        <div className="admin_card admin_card_pad"><h6>History</h6><ul className="admin_timeline">{r.history.map((h, i) => <li key={i}><strong>{h.action}</strong> · {when(h.at)} · {h.byEmail}{h.note ? ` — ${h.note}` : ""}</li>)}</ul></div>
      </div>

      {dialog && (
        <CommonModal show handleClose={() => setDialog(null)} backdrop="static" className="admin_delete_confirm_modal" heading={{ approve: "Approve refund", reject: "Reject refund", complete: "Record completed payment", fail: "Mark payment failed" }[dialog]}>
          {dErr && <div className="admin_error_banner mb-2" role="alert">{dErr}</div>}
          <Form className="admin_form" onSubmit={(e) => e.preventDefault()}>
            {dialog === "approve" && <><p className="small text-muted">The authorised amount is reserved against the order immediately, so refunds can never add up to more than the order total. Approving does not pay anything; record the payment as a separate step.</p><Form.Label htmlFor="a-amt">Authorised amount (₹)</Form.Label><Form.Control id="a-amt" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className="mb-2" /></>}
            {dialog === "complete" && <><Form.Label htmlFor="c-utr">UTR / transaction reference *</Form.Label><Form.Control id="c-utr" value={f.utr} maxLength={60} onChange={(e) => setF({ ...f, utr: e.target.value })} className="mb-2" /><Form.Label htmlFor="c-date">Refund date (defaults to today)</Form.Label><Form.Control id="c-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="mb-2" /></>}
            <Form.Label htmlFor="d-note">{dialog === "reject" || dialog === "fail" ? "Reason *" : "Note"}</Form.Label>
            <Form.Control id="d-note" value={f.note} maxLength={500} onChange={(e) => setF({ ...f, note: e.target.value })} className="mb-2" />
            <div className="admin_delete_confirm_actions">
              <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => setDialog(null)}>Close</CommonButton>
              <CommonButton className={`${dialog === "reject" || dialog === "fail" ? "admin_danger_btn" : "admin_primary_btn"} admin_sm_btn`} onClick={() => {
                if (dialog === "approve") act({ action: "approve", amount: f.amount, note: f.note }, "Refund approved and the amount reserved.", true);
                else if (dialog === "reject") act({ action: "reject", note: f.note }, "Refund rejected.", true);
                else if (dialog === "complete") act({ action: "complete", utr: f.utr, refundDate: f.date || undefined, note: f.note }, "Refund marked as completed.", true);
                else act({ action: "fail", note: f.note }, "Refund marked as failed; the reserved amount was released.", true);
              }}>Confirm</CommonButton>
            </div>
          </Form>
        </CommonModal>
      )}
    </section>
  );
}
