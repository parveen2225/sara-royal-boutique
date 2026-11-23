"use client";

import { use, useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import Image from "next/image";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import CommonModal from "@/components/common/Modal/CommonModal";
import ImageListEditor from "@/components/admin/suits/ImageListEditor";
import { useCurrentAdmin } from "@/lib/admin/useCurrentAdmin";
import { errorMessage } from "@/lib/api/suitsApi";
import { ordersApi, type OrderSuit } from "@/lib/api/ordersApi";
import { refundsApi, returnsApi, type ReturnDetail } from "@/lib/api/returnsApi";
import { formatInrPaise } from "@/lib/money";
import "@/components/admin/suits/suits.scss";
import PageHeader from "@/components/admin/ui/PageHeader";

type Dialog = null | "reject" | "inspect" | "exchange" | "shipping" | "refund" | "note" | "photos";
const when = (d?: string) => (d ? new Date(d).toLocaleString("en-IN") : "—");
const REASON = { preference: "Customer preference", wrong_item: "Wrong item sent", defective: "Defective item" } as const;

export default function ReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useCurrentAdmin();
  const [r, setR] = useState<ReturnDetail | null>(null);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [tick, setTick] = useState(0);
  const [dialog, setDialog] = useState<Dialog>(null); const [dErr, setDErr] = useState("");
  const [f, setF] = useState({ note: "", result: "resellable", courier: "", tracking: "", url: "", amount: "", method: "upi", q: "", qty: "1" });
  const [hits, setHits] = useState<OrderSuit[]>([]); const [repl, setRepl] = useState<OrderSuit | null>(null);
  const [newPhotos, setNewPhotos] = useState<{ url: string; publicId: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    returnsApi.get(id).then((x) => !cancelled && setR(x)).catch((e) => !cancelled && setError(errorMessage(e)));
    return () => { cancelled = true; };
  }, [id, tick]);
  useEffect(() => {
    if (dialog !== "exchange" || f.q.trim().length < 1) return;
    let cancelled = false;
    const t = setTimeout(() => ordersApi.searchSuits(f.q).then((h) => !cancelled && setHits(h)).catch(() => {}), 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [f.q, dialog]);

  if (error && !r) return <div className="admin_error_banner" role="alert">{error}</div>;
  if (!r) return null;
  const canStock = Boolean(user?.permissions.stock);
  const reload = () => setTick((t) => t + 1);
  const open = (d: Dialog) => { setDErr(""); setF({ note: "", result: "resellable", courier: r.returnShipping.courier ?? "", tracking: r.returnShipping.trackingNumber ?? "", url: r.returnShipping.trackingUrl ?? "", amount: "", method: "upi", q: "", qty: "1" }); setRepl(null); setNewPhotos([]); setDialog(d); };
  const act = async (fn: () => Promise<unknown>, ok: string, inDialog = false) => {
    setError(""); setNotice(""); setDErr("");
    try { await fn(); setNotice(ok); if (inDialog) setDialog(null); reload(); } catch (e) { if (inDialog) setDErr(errorMessage(e)); else setError(errorMessage(e)); }
  };
  const doAct = (body: Record<string, unknown>, ok: string, inDialog = false) => act(() => returnsApi.act(r.id, body), ok, inDialog);
  const approved = r.decision.status === "approved";
  const stepDone = (b: boolean) => (b ? "✓" : "○");

  return (
    <section>
      <PageHeader title={r.returnId} subtitle={<span className="ad_pill_row"><span className={`admin_pill ${r.decision.status}`}>{r.decision.status}</span>{r.restocked && <span className="admin_pill resellable">restocked</span>}</span>} actions={<CommonButton role="link" to="/admin/returns" className="admin_outline_btn">All returns</CommonButton>} />
      {error && <div className="admin_error_banner mb-3" role="alert">{error}</div>}
      {notice && <div className="admin_success_banner" role="status">{notice}</div>}

      <div className="admin_card admin_card_pad mb-3">
        <p className="mb-2 small text-muted">Steps: {stepDone(approved)} approved · {stepDone(r.receipt.status === "received")} received · {stepDone(r.inspection.result !== "pending")} inspected · {stepDone(r.restocked)} restocked (only if resellable)</p>
        <div className="admin_row_actions">
          {r.decision.status === "pending" && <>
            <CommonButton className="admin_primary_btn admin_sm_btn" onClick={() => doAct({ action: "decide", decision: "approved" }, "Return approved. Stock is NOT restored yet.")}>Approve</CommonButton>
            <CommonButton className="admin_danger_btn admin_sm_btn" onClick={() => open("reject")}>Reject…</CommonButton>
          </>}
          {approved && r.receipt.status === "not_received" && <CommonButton className="admin_primary_btn admin_sm_btn" onClick={() => doAct({ action: "receive" }, "Marked as physically received.")}>Mark received</CommonButton>}
          {r.receipt.status === "received" && r.inspection.result === "pending" && <CommonButton className="admin_primary_btn admin_sm_btn" onClick={() => open("inspect")}>Record inspection…</CommonButton>}
          {approved && r.inspection.result === "resellable" && !r.restocked && canStock && <CommonButton className="admin_primary_btn admin_sm_btn" onClick={() => doAct({ action: "restock" }, "Stock restored (once).")}>Restore stock</CommonButton>}
          {approved && r.inspection.result === "resellable" && !r.restocked && !canStock && <small className="text-muted align-self-center">Restoring stock needs the stock permission.</small>}
          {approved && r.resolution !== "closed" && !r.exchange?.fulfilled && <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => open("exchange")}>Exchange…</CommonButton>}
          {approved && r.exchange && !r.exchange.fulfilled && r.resolution === "exchange" && canStock && <CommonButton className="admin_primary_btn admin_sm_btn" onClick={() => doAct({ action: "fulfil-exchange" }, "Replacement sent; stock deducted (once).")}>Send replacement</CommonButton>}
          {approved && <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => open("refund")}>Recommend refund…</CommonButton>}
          {approved && r.resolution !== "closed" && !r.exchange?.fulfilled && <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => doAct({ action: "resolve", resolution: "closed" }, "Return closed.")}>Close</CommonButton>}
          <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => open("shipping")}>Return shipping…</CommonButton>
          <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => open("photos")}>Add photos…</CommonButton>
          <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => open("note")}>Add note…</CommonButton>
        </div>
      </div>

      <div className="admin_two_col mb-3">
        <div className="admin_card admin_card_pad">
          <h6>Request</h6>
          <dl className="admin_kv">
            <dt>Order</dt><dd>{r.orderId} <CommonButton role="link" to={`/admin/orders/${r.orderRef}`} className="admin_outline_btn admin_sm_btn ms-2">Open order</CommonButton></dd>
            <dt>Type</dt><dd>{r.type}</dd>
            <dt>Reason</dt><dd>{REASON[r.reasonType]}{r.reasonNote ? ` — ${r.reasonNote}` : ""}</dd>
            <dt>Condition</dt><dd>{r.reasonType === "preference" ? (r.unusedUncutConfirmed ? "Confirmed unused, uncut, original" : "Not confirmed") : "Evidence photos"}</dd>
            <dt>Requested</dt><dd>{when(r.requestedAt)} · delivered {when(r.deliveredAt)}</dd>
            <dt>Window</dt><dd>{r.withinWindow ? "Within 3 days of delivery" : `Outside the window — exception: ${r.exceptionNote}`}</dd>
            <dt>Return shipping</dt><dd>Paid by the <strong>{r.returnShipping.paidBy}</strong>{r.returnShipping.courier ? ` · ${r.returnShipping.courier} ${r.returnShipping.trackingNumber ?? ""}` : ""}{r.returnShipping.trackingUrl && <> · <a href={r.returnShipping.trackingUrl} target="_blank" rel="noopener noreferrer">track</a></>}</dd>
          </dl>
        </div>
        <div className="admin_card admin_card_pad">
          <h6>Items</h6>
          <table className="admin_history_table"><thead><tr><th>Suit</th><th>SKU</th><th>Qty</th><th>Value</th></tr></thead><tbody>{r.items.map((i) => <tr key={i.suitId}><td>{i.name}</td><td>{i.sku}</td><td>{i.quantity}</td><td>{formatInrPaise(i.unitPricePaise * i.quantity)}</td></tr>)}</tbody></table>
          <dl className="admin_kv mt-3">
            <dt>Decision</dt><dd>{r.decision.status}{r.decision.byEmail ? ` by ${r.decision.byEmail}` : ""}{r.decision.note ? ` — ${r.decision.note}` : ""}</dd>
            <dt>Received</dt><dd>{r.receipt.status === "received" ? when(r.receipt.at) : "Not yet"}</dd>
            <dt>Inspection</dt><dd>{r.inspection.result}{r.inspection.note ? ` — ${r.inspection.note}` : ""}</dd>
            <dt>Resolution</dt><dd>{r.resolution}{r.exchange ? ` · replacement ${r.exchange.sku} ×${r.exchange.quantity} (${r.exchange.fulfilled ? "sent" : "not sent yet"})` : ""}</dd>
          </dl>
        </div>
      </div>

      {r.photos.length > 0 && (
        <div className="admin_card admin_card_pad mb-3"><h6>Photos</h6><div className="admin_img_grid">{r.photos.map((u) => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="admin_img_tile"><Image src={u} alt="Return evidence" width={300} height={300} unoptimized /></a>)}</div></div>
      )}

      <div className="admin_two_col">
        <div className="admin_card admin_card_pad">
          <h6>Refunds</h6>
          {r.refunds.length === 0 ? <p className="text-muted small mb-0">No refund recommended for this return.</p> : r.refunds.map((x) => <p key={x.id} className="mb-1"><a href={`/admin/refunds/${x.id}`}>{x.refundId}</a> · {formatInrPaise(x.amountPaise)} · <span className={`admin_pill ${x.approval.status}`}>{x.approval.status}</span> <span className={`admin_pill ${x.status}`}>{x.status}</span></p>)}
          <h6 className="mt-3">Stock movements</h6>
          {r.stockMovements.length === 0 ? <p className="text-muted small mb-0">None.</p> : r.stockMovements.map((m, i) => <p key={i} className="mb-1 small">{m.sku}: {m.change > 0 ? "+" : ""}{m.change} → {m.resultingQty} ({m.reason})</p>)}
        </div>
        <div className="admin_card admin_card_pad"><h6>History</h6><ul className="admin_timeline">{r.history.map((h, i) => <li key={i}><strong>{h.action}</strong> · {when(h.at)} · {h.byEmail}{h.note ? ` — ${h.note}` : ""}</li>)}</ul></div>
      </div>

      {dialog && (
        <CommonModal show handleClose={() => setDialog(null)} backdrop="static" className="admin_delete_confirm_modal"
          heading={{ reject: "Reject return", inspect: "Inspection", exchange: "Exchange", shipping: "Return shipping", refund: "Recommend a refund", note: "Add note", photos: "Add evidence photos" }[dialog]}>
          {dErr && <div className="admin_error_banner mb-2" role="alert">{dErr}</div>}
          <Form className="admin_form" onSubmit={(e) => e.preventDefault()}>
            {dialog === "inspect" && (<><Form.Label htmlFor="i-res">Result</Form.Label><Form.Select id="i-res" value={f.result} onChange={(e) => setF({ ...f, result: e.target.value })} className="mb-2"><option value="resellable">Resellable (unused, uncut, original)</option><option value="not_resellable">Not resellable</option></Form.Select></>)}
            {dialog === "shipping" && (<><Form.Label htmlFor="s-c">Courier</Form.Label><Form.Control id="s-c" value={f.courier} onChange={(e) => setF({ ...f, courier: e.target.value })} className="mb-2" /><Form.Label htmlFor="s-t">Tracking number</Form.Label><Form.Control id="s-t" value={f.tracking} onChange={(e) => setF({ ...f, tracking: e.target.value })} className="mb-2" /><Form.Label htmlFor="s-u">Tracking link (https://…)</Form.Label><Form.Control id="s-u" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} className="mb-2" /></>)}
            {dialog === "exchange" && (<>
              <Form.Label htmlFor="x-q">Replacement suit</Form.Label>
              <Form.Control id="x-q" placeholder="Search by name or SKU" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} className="mb-2" />
              {hits.length > 0 && f.q && <ul className="list-group mb-2">{hits.map((h) => <li key={h.id} className="list-group-item d-flex justify-content-between"><span>{h.name} <small className="text-muted">{h.sku} · {h.stock} in stock</small></span><CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => { setRepl(h); setHits([]); setF({ ...f, q: "" }); }}>Choose</CommonButton></li>)}</ul>}
              {repl && <p className="small">Replacement: <strong>{repl.name}</strong> ({repl.sku}, {repl.stock} in stock)</p>}
              <Form.Label htmlFor="x-n">Quantity</Form.Label><Form.Control id="x-n" type="number" min={1} value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} className="mb-2" />
            </>)}
            {dialog === "refund" && (<>
              <p className="small text-muted">This only <strong>recommends</strong> a refund. The Owner approves the amount and later records the payment. Manual refunds only (UPI / bank transfer).</p>
              <Form.Label htmlFor="rf-a">Amount (₹)</Form.Label><Form.Control id="rf-a" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className="mb-2" />
              <Form.Label htmlFor="rf-m">Method</Form.Label><Form.Select id="rf-m" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} className="mb-2"><option value="upi">UPI</option><option value="bank_transfer">Bank transfer</option></Form.Select>
            </>)}
            {dialog === "photos" && <ImageListEditor label="Evidence photos" images={newPhotos} max={10 - r.photos.length} onChange={setNewPhotos} />}
            {dialog !== "shipping" && dialog !== "photos" && (<><Form.Label htmlFor="n-n">{dialog === "reject" ? "Reason *" : "Note"}</Form.Label><Form.Control id="n-n" value={f.note} maxLength={500} onChange={(e) => setF({ ...f, note: e.target.value })} className="mb-2" /></>)}
            <div className="admin_delete_confirm_actions">
              <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => setDialog(null)}>Close</CommonButton>
              <CommonButton className="admin_primary_btn admin_sm_btn" onClick={() => {
                if (dialog === "reject") doAct({ action: "decide", decision: "rejected", note: f.note }, "Return rejected.", true);
                else if (dialog === "inspect") doAct({ action: "inspect", result: f.result, note: f.note }, "Inspection recorded.", true);
                else if (dialog === "shipping") doAct({ action: "shipping", courier: f.courier, trackingNumber: f.tracking, trackingUrl: f.url }, "Return shipping saved.", true);
                else if (dialog === "note") doAct({ action: "note", note: f.note }, "Note added.", true);
                else if (dialog === "photos") doAct({ action: "photos", photos: newPhotos.map((p) => p.url) }, "Photos added.", true);
                else if (dialog === "exchange") { if (!repl) return setDErr("Choose the replacement suit."); doAct({ action: "resolve", resolution: "exchange", exchange: { replacementSuitId: repl.id, quantity: Number(f.qty) }, note: f.note }, "Exchange set. Use “Send replacement” to dispatch it.", true); }
                else if (dialog === "refund") act(() => refundsApi.recommend({ orderId: r.orderRef, returnId: r.id, amount: f.amount, method: f.method, notes: f.note }), "Refund recommended. The Owner must approve it.", true);
              }}>{dialog === "reject" ? "Reject return" : "Save"}</CommonButton>
            </div>
          </Form>
        </CommonModal>
      )}
    </section>
  );
}
