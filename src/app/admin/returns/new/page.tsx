"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Col, Form, Row } from "react-bootstrap";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import ImageListEditor from "@/components/admin/suits/ImageListEditor";
import { errorMessage, type SuitImage } from "@/lib/api/suitsApi";
import { ordersApi, type Order } from "@/lib/api/ordersApi";
import { returnsApi } from "@/lib/api/returnsApi";
import { formatInrPaise } from "@/lib/money";
import "@/components/admin/suits/suits.scss";
import PageHeader from "@/components/admin/ui/PageHeader";

const ymd = (d: Date) => new Date(d.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8))) / 86400000);

function NewReturn() {
  const router = useRouter();
  const preset = useSearchParams()?.get("order") ?? "";
  const [q, setQ] = useState(""); const [hits, setHits] = useState<Order[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reasonType, setReasonType] = useState<"preference" | "wrong_item" | "defective">("preference");
  const [type, setType] = useState<"return" | "exchange">("return");
  const [note, setNote] = useState(""); const [confirm, setConfirm] = useState(false);
  const [photos, setPhotos] = useState<SuitImage[]>([]);
  const [requested, setRequested] = useState(() => ymd(new Date()));
  const [exception, setException] = useState("");
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!preset) return;
    let cancelled = false;
    ordersApi.get(preset).then((o) => !cancelled && setOrder(o)).catch(() => {});
    return () => { cancelled = true; };
  }, [preset]);
  useEffect(() => {
    if (q.trim().length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => ordersApi.list({ q, status: "delivered", limit: 10 }).then((r) => !cancelled && setHits(r.items)).catch(() => {}), 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  const days = order?.deliveredAt ? daysBetween(ymd(new Date(order.deliveredAt)), requested) : 0;
  const outside = order ? days > 3 : false;
  const chosen = order ? order.items.filter((i) => (qty[i.suitId] ?? 0) > 0) : [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!order) return setError("Choose the order first.");
    if (chosen.length === 0) return setError("Enter the quantity being returned for at least one suit.");
    setSaving(true);
    try {
      const r = await returnsApi.create({
        orderId: order.id, type, reasonType, reasonNote: note, unusedUncutConfirmed: confirm, requestedAt: requested,
        exceptionNote: outside ? exception : "", photos: photos.map((p) => p.url),
        items: chosen.map((i) => ({ suitId: i.suitId, quantity: qty[i.suitId] })),
      });
      router.push(`/admin/returns/${r.id}`);
    } catch (err) {
      setError(errorMessage(err, "Could not record the return."));
      setSaving(false);
    }
  };

  return (
    <section>
      <PageHeader title="Record return / exchange" subtitle="Pick the delivered order and the items coming back. Eligibility is checked when you save." actions={<CommonButton role="link" to="/admin/returns" className="admin_outline_btn">All returns</CommonButton>} />
      {error && <div className="admin_error_banner mb-3" role="alert">{error}</div>}
      <Form className="admin_form" onSubmit={submit} noValidate>
        <Row className="g-3">
          <Col lg={6}>
            <div className="admin_card admin_card_pad">
              <h6>Order</h6>
              {order ? (
                <p className="mb-2"><strong>{order.orderId}</strong> · {order.customer.name} · delivered {order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString("en-IN") : "—"} <button type="button" className="admin_outline_btn admin_sm_btn ms-2" onClick={() => { setOrder(null); setQty({}); }}>Change</button></p>
              ) : (
                <>
                  <Form.Control aria-label="Find delivered order" placeholder="Search delivered orders by order ID, name or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
                  {hits.length > 0 && q && <ul className="list-group mt-2">{hits.map((h) => <li key={h.id} className="list-group-item d-flex justify-content-between align-items-center"><span><strong>{h.orderId}</strong> {h.customer.name} <small className="text-muted">{formatInrPaise(h.totalPaise)}</small></span><CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => { setOrder(h); setHits([]); setQ(""); }}>Select</CommonButton></li>)}</ul>}
                </>
              )}
              {order && (
                <table className="admin_history_table mt-2">
                  <thead><tr><th>Suit</th><th>Ordered</th><th>Already returned</th><th style={{ width: 90 }}>Return qty</th></tr></thead>
                  <tbody>{order.items.map((i) => {
                    const left = i.quantity - (i.returnedQuantity ?? 0);
                    return <tr key={i.suitId}><td>{i.name}<small className="d-block text-muted">{i.sku}</small></td><td>{i.quantity}</td><td>{i.returnedQuantity ?? 0}</td><td><Form.Control aria-label={`Return quantity for ${i.name}`} type="number" min={0} max={left} disabled={left <= 0} value={qty[i.suitId] ?? 0} onChange={(e) => setQty({ ...qty, [i.suitId]: Math.max(0, Math.min(Number(e.target.value) || 0, left)) })} /></td></tr>;
                  })}</tbody>
                </table>
              )}
            </div>
          </Col>
          <Col lg={6}>
            <div className="admin_card admin_card_pad">
              <h6>Details</h6>
              <Row className="g-2">
                <Col sm={6}><Form.Label htmlFor="r-type">Type</Form.Label><Form.Select id="r-type" value={type} onChange={(e) => setType(e.target.value as "return" | "exchange")}><option value="return">Return</option><option value="exchange">Exchange</option></Form.Select></Col>
                <Col sm={6}><Form.Label htmlFor="r-reason">Reason</Form.Label><Form.Select id="r-reason" value={reasonType} onChange={(e) => setReasonType(e.target.value as typeof reasonType)}><option value="preference">Customer preference</option><option value="wrong_item">Wrong item sent</option><option value="defective">Defective item</option></Form.Select></Col>
                <Col sm={6}><Form.Label htmlFor="r-date">Customer asked on</Form.Label><Form.Control id="r-date" type="date" value={requested} max={ymd(new Date())} onChange={(e) => setRequested(e.target.value)} /></Col>
              </Row>
              {order && <p className={`small mt-2 mb-1 ${outside ? "text-danger" : "text-muted"}`}>{days < 0 ? "Request date is before delivery." : `${days} day(s) after delivery — ${outside ? "outside the standard 3-day window." : "within the 3-day window."}`}</p>}
              {outside && (<><Form.Label htmlFor="r-exc">Why are you accepting it? (exception note) *</Form.Label><Form.Control id="r-exc" value={exception} maxLength={500} onChange={(e) => setException(e.target.value)} className="mb-2" /></>)}
              <Form.Label htmlFor="r-note" className="mt-1">Customer’s reason / notes</Form.Label>
              <Form.Control id="r-note" as="textarea" rows={2} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
              {reasonType === "preference" ? (
                <Form.Check id="r-conf" type="checkbox" className="mt-2" label="I confirmed the item is unused, uncut and in its original condition" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
              ) : (
                <p className="small text-muted mt-2 mb-0">Wrong or defective item: photo evidence is required, and the boutique pays the return shipping.</p>
              )}
            </div>
          </Col>
          <Col xs={12}>
            <div className="admin_card admin_card_pad"><ImageListEditor label={reasonType === "preference" ? "Customer photos (optional)" : "Customer photos (required)"} hint="Upload the photos the customer sent on WhatsApp." images={photos} max={10} onChange={setPhotos} /></div>
          </Col>
          <Col xs={12}><CommonButton type="submit" className="admin_primary_btn" disabled={saving} isLoading={saving}>Record request</CommonButton> <small className="text-muted ms-2">Nothing is approved automatically and no stock changes yet.</small></Col>
        </Row>
      </Form>
    </section>
  );
}

export default function NewReturnPage() { return <Suspense fallback={null}><NewReturn /></Suspense>; }
