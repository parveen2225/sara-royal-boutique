"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Col, Form, Row } from "react-bootstrap";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { errorMessage } from "@/lib/api/suitsApi";
import { ordersApi, type OrderSuit } from "@/lib/api/ordersApi";
import { formatInrPaise } from "@/lib/money";
import "@/components/admin/suits/suits.scss";
import PageHeader from "@/components/admin/ui/PageHeader";

type Line = OrderSuit & { quantity: number };

export default function NewOrderPage() {
  const router = useRouter();
  // One key per form: a double click or retry can never create (or deduct stock for) a second order.
  const [key] = useState(() => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`));
  const [lines, setLines] = useState<Line[]>([]);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<OrderSuit[]>([]);
  const [c, setC] = useState({ name: "", phone: "", address: "", pincode: "" });
  const [delivery, setDelivery] = useState("");
  const [method, setMethod] = useState<"cod" | "upi">("cod");
  const [paid, setPaid] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q.trim().length < 1) return;
    let cancelled = false;
    const t = setTimeout(() => ordersApi.searchSuits(q).then((r) => !cancelled && setHits(r)).catch(() => !cancelled && setHits([])), 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  const subtotal = lines.reduce((s, l) => s + l.salePricePaise * l.quantity, 0);
  const deliveryPaise = (() => { const m = /^\d{1,7}(\.\d{1,2})?$/.exec(delivery.trim()); if (!m) return 0; const [w, f = ""] = delivery.trim().split("."); return Number(w) * 100 + Number(f.padEnd(2, "0")); })();

  const add = (s: OrderSuit) => {
    setQ(""); setHits([]);
    setLines((cur) => (cur.some((l) => l.id === s.id) ? cur : [...cur, { ...s, quantity: 1 }]));
  };
  const setQty = (id: string, n: number) => setLines((cur) => cur.map((l) => (l.id === id ? { ...l, quantity: Math.max(1, Math.min(n || 1, 999)) } : l)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (lines.length === 0) return setError("Add at least one suit.");
    const over = lines.find((l) => l.quantity > l.stock);
    if (over) return setError(`Only ${over.stock} of ${over.sku} in stock.`);
    if (delivery.trim() && !/^\d{1,7}(\.\d{1,2})?$/.test(delivery.trim())) return setError("Delivery charge must be a number.");
    setSaving(true);
    try {
      const order = await ordersApi.create({
        idempotencyKey: key,
        customer: c,
        items: lines.map((l) => ({ suitId: l.id, quantity: l.quantity })),
        deliveryCharge: delivery.trim() || 0,
        paymentMethod: method,
        paymentStatus: paid ? "paid" : "pending",
        notes,
      });
      router.push(`/admin/orders/${order.id}?created=1`);
    } catch (err) {
      setError(errorMessage(err, "Could not create the order."));
      setSaving(false);
    }
  };

  return (
    <section>
      <PageHeader title="New order" subtitle="Enter the order after the customer confirmed on WhatsApp. Saving it confirms the order and deducts stock immediately. Prices are taken from the current sale price and then frozen." actions={<CommonButton role="link" to="/admin/orders" className="admin_outline_btn">All orders</CommonButton>} />
      {error && <div className="admin_error_banner mb-3" role="alert">{error}</div>}
      <Form className="admin_form" onSubmit={submit} noValidate>
        <Row className="g-3">
          <Col lg={7}>
            <div className="admin_card admin_card_pad">
              <h6>Suits</h6>
              <Form.Control aria-label="Search suits" placeholder="Search suit by name or SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
              {hits.length > 0 && q && (
                <ul className="list-group mt-2" role="listbox" aria-label="Suit results">
                  {hits.map((s) => (
                    <li key={s.id} className="list-group-item d-flex justify-content-between align-items-center gap-2" role="option" aria-selected="false">
                      <span><strong>{s.name}</strong> <small className="text-muted">{s.sku} · {formatInrPaise(s.salePricePaise)} · {s.stock} in stock{s.status !== "published" ? ` · ${s.status}` : ""}</small></span>
                      <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => add(s)} disabled={s.stock <= 0}>{s.stock <= 0 ? "Out of stock" : "Add"}</CommonButton>
                    </li>
                  ))}
                </ul>
              )}
              {lines.length > 0 && (
                <table className="admin_history_table mt-3">
                  <thead><tr><th>Suit</th><th>Price</th><th style={{ width: 90 }}>Qty</th><th>Total</th><th /></tr></thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.id}>
                        <td><strong>{l.name}</strong><small className="d-block text-muted">{l.sku} · {l.stock} in stock</small></td>
                        <td>{formatInrPaise(l.salePricePaise)}</td>
                        <td><Form.Control aria-label={`Quantity of ${l.name}`} type="number" min={1} max={l.stock} value={l.quantity} onChange={(e) => setQty(l.id, Number(e.target.value))} /></td>
                        <td>{formatInrPaise(l.salePricePaise * l.quantity)}</td>
                        <td><button type="button" className="admin_danger_btn admin_sm_btn" onClick={() => setLines((cur) => cur.filter((x) => x.id !== l.id))} aria-label={`Remove ${l.name}`}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Col>
          <Col lg={5}>
            <div className="admin_card admin_card_pad">
              <h6>Customer</h6>
              <Form.Label htmlFor="o-name">Name *</Form.Label>
              <Form.Control id="o-name" value={c.name} maxLength={120} onChange={(e) => setC({ ...c, name: e.target.value })} className="mb-2" />
              <Form.Label htmlFor="o-phone">WhatsApp / phone *</Form.Label>
              <Form.Control id="o-phone" inputMode="tel" value={c.phone} placeholder="98765 43210" onChange={(e) => setC({ ...c, phone: e.target.value })} className="mb-2" />
              <Form.Label htmlFor="o-address">Full delivery address *</Form.Label>
              <Form.Control as="textarea" rows={3} id="o-address" value={c.address} maxLength={500} onChange={(e) => setC({ ...c, address: e.target.value })} className="mb-2" />
              <Form.Label htmlFor="o-pin">PIN code *</Form.Label>
              <Form.Control id="o-pin" inputMode="numeric" maxLength={6} value={c.pincode} onChange={(e) => setC({ ...c, pincode: e.target.value.replace(/\D/g, "") })} />
            </div>
          </Col>
          <Col lg={7}>
            <div className="admin_card admin_card_pad">
              <h6>Payment &amp; delivery</h6>
              <Row className="g-2">
                <Col sm={4}><Form.Label htmlFor="o-del">Delivery charge (₹)</Form.Label><Form.Control id="o-del" inputMode="decimal" value={delivery} placeholder="0" onChange={(e) => setDelivery(e.target.value)} /></Col>
                <Col sm={4}><Form.Label htmlFor="o-method">Payment method</Form.Label><Form.Select id="o-method" value={method} onChange={(e) => setMethod(e.target.value as "cod" | "upi")}><option value="cod">Cash on Delivery</option><option value="upi">Prepaid UPI</option></Form.Select></Col>
                <Col sm={4} className="d-flex align-items-end"><Form.Check id="o-paid" type="checkbox" label="Already paid" checked={paid} onChange={(e) => setPaid(e.target.checked)} /></Col>
              </Row>
              <Form.Label htmlFor="o-notes" className="mt-2">Notes</Form.Label>
              <Form.Control id="o-notes" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </Col>
          <Col lg={5}>
            <div className="admin_card admin_card_pad">
              <dl className="admin_kv">
                <dt>Products</dt><dd>{formatInrPaise(subtotal)}</dd>
                <dt>Delivery</dt><dd>{formatInrPaise(deliveryPaise)}</dd>
                <dt><strong>Total</strong></dt><dd><strong>{formatInrPaise(subtotal + deliveryPaise)}</strong></dd>
              </dl>
              <CommonButton type="submit" className="admin_primary_btn mt-3 w-100" disabled={saving} isLoading={saving}>Confirm order &amp; deduct stock</CommonButton>
            </div>
          </Col>
        </Row>
      </Form>
    </section>
  );
}
