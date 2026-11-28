"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Form } from "react-bootstrap";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import CommonModal from "@/components/common/Modal/CommonModal";
import { errorMessage } from "@/lib/api/suitsApi";
import { ordersApi, type OrderDetail } from "@/lib/api/ordersApi";
import { formatInrPaise } from "@/lib/money";
import { refundsApi, returnsApi, type RefundRow, type ReturnRow } from "@/lib/api/returnsApi";
import { useCurrentAdmin } from "@/lib/admin/useCurrentAdmin";
import { buildStatusMessage } from "@/lib/suitWhatsapp";
import { buildWhatsAppUrl } from "@/lib/suitWhatsapp";
import "@/components/admin/suits/suits.scss";
import PageHeader from "@/components/admin/ui/PageHeader";

type Dialog = null | "shipped" | "delivered" | "cancel" | "courier";
const when = (d?: string) => (d ? new Date(d).toLocaleString("en-IN") : "—");

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const created = useSearchParams()?.get("created") === "1";
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [boutique, setBoutique] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(created ? "Order confirmed and stock deducted." : "");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [form, setForm] = useState({ courierName: "", trackingNumber: "", trackingUrl: "", date: "", reason: "" });
  const [dialogError, setDialogError] = useState("");
  const [tick, setTick] = useState(0);
  const { user } = useCurrentAdmin();
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    ordersApi.get(id).then((o) => !cancelled && setOrder(o)).catch((e) => !cancelled && setError(errorMessage(e, "Could not load the order.")));
    ordersApi.settings().then((s) => !cancelled && setBoutique(s.boutiqueName)).catch(() => {});
    returnsApi.list({ orderRef: id, limit: 50 }).then((r) => !cancelled && setReturns(r.items)).catch(() => {}); // needs the returns permission; quietly empty otherwise
    refundsApi.list({ orderRef: id, limit: 50 }).then((r) => !cancelled && setRefunds(r.items)).catch(() => {});
    return () => { cancelled = true; };
  }, [id, tick]);

  if (error && !order) return <div className="admin_error_banner" role="alert">{error}</div>;
  if (!order) return null;
  const o = order;
  const reload = () => setTick((t) => t + 1);

  const act = async (fn: () => Promise<unknown>, success: string, closeDialog = false) => {
    setError(""); setNotice(""); setDialogError("");
    try {
      await fn();
      setNotice(success);
      if (closeDialog) setDialog(null);
      reload();
    } catch (e) {
      if (closeDialog) setDialogError(errorMessage(e)); else setError(errorMessage(e));
    }
  };
  const open = (d: Dialog) => {
    setDialogError("");
    setForm({ courierName: o.courier.name ?? "", trackingNumber: o.courier.trackingNumber ?? "", trackingUrl: o.courier.trackingUrl ?? "", date: "", reason: "" });
    setDialog(d);
  };

  const waLink = (status: "confirmed" | "packed" | "shipped" | "delivered") =>
    buildWhatsAppUrl(o.customer.phone, buildStatusMessage({ orderId: o.orderId, status, customerName: o.customer.name, courierName: o.courier.name, trackingNumber: o.courier.trackingNumber, trackingUrl: o.courier.trackingUrl, boutiqueName: boutique || undefined }));
  const rank = { confirmed: 0, packed: 1, shipped: 2, delivered: 3 } as Record<string, number>;
  const live = o.status !== "cancelled";

  return (
    <section>
      <PageHeader title={o.orderId} subtitle={<span className="ad_pill_row"><span className={`admin_pill ${o.status}`}>{o.status}</span><span className={`admin_pill ${o.paymentStatus}`}>{o.paymentMethod.toUpperCase()} {o.paymentStatus}</span></span>} actions={<CommonButton role="link" to="/admin/orders" className="admin_outline_btn">All orders</CommonButton>} />
      {error && <div className="admin_error_banner mb-3" role="alert">{error}</div>}
      {notice && <div className="admin_success_banner" role="status">{notice}</div>}

      <div className="admin_card admin_card_pad mb-3">
        <div className="admin_row_actions">
          {o.status === "confirmed" && <CommonButton className="admin_primary_btn admin_sm_btn" onClick={() => act(() => ordersApi.setStatus(o.id, { status: "packed" }), "Marked as packed.")}>Mark packed</CommonButton>}
          {(o.status === "confirmed" || o.status === "packed") && <CommonButton className="admin_primary_btn admin_sm_btn" onClick={() => open("shipped")}>Mark shipped…</CommonButton>}
          {o.status === "shipped" && <CommonButton className="admin_primary_btn admin_sm_btn" onClick={() => open("delivered")}>Mark delivered…</CommonButton>}
          {live && <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => open("courier")}>Edit courier / tracking</CommonButton>}
          {live && o.paymentStatus === "pending" && <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => act(() => ordersApi.setPayment(o.id, "paid"), "Payment marked as received.")}>Mark payment received</CommonButton>}
          {live && o.paymentStatus === "paid" && o.refundCommittedPaise === 0 && <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => act(() => ordersApi.setPayment(o.id, "pending"), "Payment marked as pending.")}>Mark payment pending</CommonButton>}
          {(o.status === "confirmed" || o.status === "packed" || o.status === "shipped") && <CommonButton className="admin_danger_btn admin_sm_btn" onClick={() => open("cancel")}>Cancel order…</CommonButton>}
          {live && <a className="admin_outline_btn admin_sm_btn" href={`/api/admin/orders/${o.id}/invoice`} target="_blank" rel="noopener noreferrer">{o.invoiceId ? `Download invoice ${o.invoiceId}` : "Generate invoice (PDF)"}</a>}
          {o.status === "delivered" && user?.permissions.returns && <CommonButton role="link" to={`/admin/returns/new?order=${o.id}`} className="admin_outline_btn admin_sm_btn">Record return…</CommonButton>}
        </div>
        {live && (
          <div className="mt-3">
            <small className="text-muted d-block mb-1">Send a status update on WhatsApp (opens a prefilled chat; you press Send):</small>
            <div className="admin_row_actions">
              {(["confirmed", "packed", "shipped", "delivered"] as const).map((s) => {
                const enabled = rank[o.status] >= rank[s] && (s !== "shipped" || Boolean(o.courier.name));
                const href = waLink(s);
                return (
                  <a key={s} className={`admin_outline_btn admin_sm_btn ${enabled && href ? "" : "disabled"}`} aria-disabled={!(enabled && href)} href={enabled && href ? href : undefined} target="_blank" rel="noopener noreferrer">
                    WhatsApp: {s}
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="admin_two_col mb-3">
        <div className="admin_card admin_card_pad">
          <h6>Customer</h6>
          <dl className="admin_kv">
            <dt>Name</dt><dd>{o.customer.name}</dd>
            <dt>WhatsApp</dt><dd>+{o.customer.phone}</dd>
            <dt>Address</dt><dd>{o.customer.address}</dd>
            <dt>PIN code</dt><dd>{o.customer.pincode}</dd>
            <dt>Notes</dt><dd>{o.notes || "—"}</dd>
          </dl>
        </div>
        <div className="admin_card admin_card_pad">
          <h6>Shipping</h6>
          <dl className="admin_kv">
            <dt>Courier</dt><dd>{o.courier.name || "—"}</dd>
            <dt>Tracking no.</dt><dd>{o.courier.trackingNumber || "—"}</dd>
            <dt>Tracking link</dt><dd>{o.courier.trackingUrl ? <a href={o.courier.trackingUrl} target="_blank" rel="noopener noreferrer">{o.courier.trackingUrl}</a> : "—"}</dd>
            <dt>Shipped on</dt><dd>{when(o.courier.shippedAt)}</dd>
            <dt>Delivered on</dt><dd>{when(o.deliveredAt)}</dd>
            {o.status === "cancelled" && (<><dt>Cancelled</dt><dd>{when(o.cancelledAt)} — {o.cancelReason}</dd></>)}
          </dl>
        </div>
      </div>

      <div className="admin_card admin_card_pad mb-3">
        <h6>Items</h6>
        <table className="admin_history_table">
          <thead><tr><th>Suit</th><th>SKU</th><th>Unit price</th><th>Qty</th><th>Line total</th></tr></thead>
          <tbody>{o.items.map((i) => <tr key={`${i.suitId}:${i.variantId ?? ""}`}><td>{i.name}</td><td>{i.sku}</td><td>{formatInrPaise(i.unitPricePaise)}</td><td>{i.quantity}</td><td>{formatInrPaise(i.lineTotalPaise)}</td></tr>)}</tbody>
        </table>
        <dl className="admin_kv mt-3">
          <dt>Products</dt><dd>{formatInrPaise(o.subtotalPaise)}</dd>
          <dt>Delivery</dt><dd>{formatInrPaise(o.deliveryChargePaise)}</dd>
          <dt><strong>Total</strong></dt><dd><strong>{formatInrPaise(o.totalPaise)}</strong></dd>
        </dl>
      </div>

      <div className="admin_two_col">
        <div className="admin_card admin_card_pad">
          <h6>Stock movements</h6>
          {o.stockMovements.length === 0 ? <p className="text-muted small mb-0">None.</p> : (
            <table className="admin_history_table"><thead><tr><th>SKU</th><th>Before</th><th>Change</th><th>After</th><th>Reason</th></tr></thead>
              <tbody>{o.stockMovements.map((m, i) => <tr key={i}><td>{m.sku}</td><td>{m.previousQty}</td><td>{m.change > 0 ? `+${m.change}` : m.change}</td><td>{m.resultingQty}</td><td>{m.reason}</td></tr>)}</tbody></table>
          )}
        </div>
        <div className="admin_card admin_card_pad">
          <h6>History</h6>
          <ul className="admin_timeline">{o.statusHistory.map((h, i) => <li key={i}><strong>{h.status}</strong> · {when(h.at)} · {h.byEmail}{h.note ? ` — ${h.note}` : ""}</li>)}</ul>
        </div>
      </div>

      {(returns.length > 0 || refunds.length > 0) && (
        <div className="admin_card admin_card_pad mt-3">
          <h6>Returns &amp; refunds</h6>
          {returns.map((x) => <p key={x.id} className="mb-1"><a href={`/admin/returns/${x.id}`}>{x.returnId}</a> · {x.items.map((i) => `${i.sku} ×${i.quantity}`).join(", ")} · <span className={`admin_pill ${x.decision.status}`}>{x.decision.status}</span>{x.restocked && <> <span className="admin_pill resellable">restocked</span></>}</p>)}
          {refunds.map((x) => <p key={x.id} className="mb-1"><a href={`/admin/refunds/${x.id}`}>{x.refundId}</a> · {formatInrPaise(x.amountPaise)} · <span className={`admin_pill ${x.approval.status}`}>{x.approval.status}</span> <span className={`admin_pill ${x.status}`}>{x.status}</span></p>)}
          <small className="text-muted">Refunded so far (approved / reserved): {formatInrPaise(o.refundCommittedPaise)} of {formatInrPaise(o.totalPaise)}</small>
        </div>
      )}

      {dialog && (
        <CommonModal show handleClose={() => setDialog(null)} backdrop="static" className="admin_delete_confirm_modal"
          heading={dialog === "shipped" ? "Mark as shipped" : dialog === "delivered" ? "Mark as delivered" : dialog === "cancel" ? "Cancel order" : "Courier & tracking"}>
          {dialogError && <div className="admin_error_banner mb-2" role="alert">{dialogError}</div>}
          <Form className="admin_form" onSubmit={(e) => e.preventDefault()}>
            {(dialog === "shipped" || dialog === "courier") && (<>
              <Form.Label htmlFor="d-courier">Courier name {dialog === "shipped" ? "*" : ""}</Form.Label>
              <Form.Control id="d-courier" value={form.courierName} maxLength={80} onChange={(e) => setForm({ ...form, courierName: e.target.value })} className="mb-2" />
              <Form.Label htmlFor="d-track">Tracking number / AWB</Form.Label>
              <Form.Control id="d-track" value={form.trackingNumber} maxLength={80} onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })} className="mb-2" />
              <Form.Label htmlFor="d-url">Tracking link (https://…)</Form.Label>
              <Form.Control id="d-url" value={form.trackingUrl} onChange={(e) => setForm({ ...form, trackingUrl: e.target.value })} className="mb-2" />
            </>)}
            {(dialog === "shipped" || dialog === "delivered") && (<>
              <Form.Label htmlFor="d-date">{dialog === "shipped" ? "Shipping date" : "Delivery date"} (optional, defaults to now)</Form.Label>
              <Form.Control id="d-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mb-2" />
            </>)}
            {dialog === "cancel" && (<>
              <p className="small text-muted">Cancelling restores the stock for this order (once). If the customer already paid, any refund is handled separately under Refunds.</p>
              <Form.Label htmlFor="d-reason">Reason *</Form.Label>
              <Form.Control id="d-reason" value={form.reason} maxLength={500} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="mb-2" />
            </>)}
            <div className="admin_delete_confirm_actions">
              <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => setDialog(null)}>Close</CommonButton>
              <CommonButton className={`${dialog === "cancel" ? "admin_danger_btn" : "admin_primary_btn"} admin_sm_btn`} onClick={() => {
                if (dialog === "shipped") act(() => ordersApi.setStatus(o.id, { status: "shipped", courierName: form.courierName, trackingNumber: form.trackingNumber, trackingUrl: form.trackingUrl, shippedAt: form.date || undefined }), "Marked as shipped.", true);
                else if (dialog === "delivered") act(() => ordersApi.setStatus(o.id, { status: "delivered", deliveredAt: form.date || undefined }), "Marked as delivered.", true);
                else if (dialog === "cancel") act(() => ordersApi.cancel(o.id, form.reason), "Order cancelled and stock restored.", true);
                else act(() => ordersApi.update(o.id, { courierName: form.courierName, trackingNumber: form.trackingNumber, trackingUrl: form.trackingUrl }), "Courier details saved.", true);
              }}>{dialog === "cancel" ? "Cancel order & restore stock" : "Save"}</CommonButton>
            </div>
          </Form>
        </CommonModal>
      )}
    </section>
  );
}
