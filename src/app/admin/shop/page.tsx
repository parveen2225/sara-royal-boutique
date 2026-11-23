"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Form } from "react-bootstrap";
import PageHeader from "@/components/admin/ui/PageHeader";
import StatCard from "@/components/admin/ui/StatCard";
import AdminIcon from "@/components/admin/ui/AdminIcon";
import { errorMessage } from "@/lib/api/suitsApi";
import { dashboardApi, type Dashboard, type RangeQuery } from "@/lib/api/adminApi";
import { formatInrPaise } from "@/lib/money";
import "@/components/admin/suits/suits.scss";

const PRESETS: { key: RangeQuery["range"]; label: string }[] = [{ key: "today", label: "Today" }, { key: "7d", label: "Last 7 days" }, { key: "30d", label: "Last 30 days" }, { key: "custom", label: "Custom" }];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const link = (path: string, extra: Record<string, string>) => `${path}?${new URLSearchParams(extra).toString()}`;

export default function ShopDashboardPage() {
  const [q, setQ] = useState<RangeQuery>({ range: "30d" });
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [d, setD] = useState<Dashboard | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (q.range === "custom" && (!q.from || !q.to)) return;
    let cancelled = false;
    dashboardApi.get(q).then((r) => { if (!cancelled) { setD(r); setUpdatedAt(new Date()); setError(""); } }).catch((e) => !cancelled && setError(errorMessage(e, "Could not load the dashboard.")));
    return () => { cancelled = true; };
  }, [q, tick]);

  const rangeParams: Record<string, string> = d ? { from: d.range.from, to: d.range.to } : {};
  const s = d?.sales;

  return (
    <section>
      <PageHeader
        title="Shop Dashboard"
        subtitle={d ? <>Orders and sales for <strong>{d.range.label}</strong> (India time). Stock figures show the position right now.</> : "Orders, sales and stock at a glance."}
        actions={
          <>
            <div className="ad_segmented" role="group" aria-label="Date range">
              {PRESETS.map((p) => (
                <button key={p.key} type="button" aria-pressed={q.range === p.key} onClick={() => (p.key === "custom" ? setQ({ range: "custom", from: custom.from || undefined, to: custom.to || undefined }) : setQ({ range: p.key }))}>{p.label}</button>
              ))}
            </div>
            <button type="button" className="ad_icon_btn" aria-label="Refresh figures" title="Refresh" onClick={() => setTick((t) => t + 1)}><AdminIcon name="undo" size={16} /></button>
          </>
        }
      />
      {q.range === "custom" && (
        <div className="ad_toolbar" aria-label="Custom date range">
          <label className="ad_date"><span>From</span><Form.Control aria-label="From date" type="date" value={custom.from} onChange={(e) => { setCustom({ ...custom, from: e.target.value }); setQ({ range: "custom", from: e.target.value, to: custom.to }); }} /></label>
          <label className="ad_date"><span>To</span><Form.Control aria-label="To date" type="date" value={custom.to} onChange={(e) => { setCustom({ ...custom, to: e.target.value }); setQ({ range: "custom", from: custom.from, to: e.target.value }); }} /></label>
        </div>
      )}
      {error && <div className="admin_error_banner" role="alert"><AdminIcon name="alert" size={16} />{error}</div>}

      {!d || !s ? (
        error ? null : <p className="ad_note" role="status">Loading figures…</p>
      ) : (
        <>
          {d.orders.attentionNow > 0 && (
            <div className="ad_callout" role="status">
              <AdminIcon name="clock" size={18} />
              <span><strong>{plural(d.orders.attentionNow, "order needs", "orders need")} attention.</strong> They are confirmed or packed and not yet shipped (all dates).</span>
              <Link className="admin_outline_btn admin_sm_btn" href="/admin/orders?status=confirmed">Open orders</Link>
            </div>
          )}

          <div className="ad_dash_section">
            <div className="ad_dash_title"><h2>Sales</h2><span>{plural(s.orderCount, "order", "orders")} counted · cancelled orders excluded</span></div>
            <div className="ad_dash_top">
              <StatCard size="hero" icon="wallet" label="Net sales" value={formatInrPaise(s.netSalesPaise)} hint="Confirmed order total minus completed refunds" title="Net sales = confirmed order total − completed refunds" />
              <div className="ad_grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                <StatCard icon="suits" label="Product sales" value={formatInrPaise(s.productSalesPaise)} hint="Excluding delivery" />
                <StatCard icon="package" label="Delivery charges" value={formatInrPaise(s.deliveryChargesPaise)} hint="Reported separately" />
                <StatCard icon="receipt" label="Confirmed order total" value={formatInrPaise(s.confirmedTotalPaise)} hint="Product sales + delivery" />
                <StatCard icon="undo" tone={s.completedRefundsPaise > 0 ? "warn" : "default"} label="Completed refunds" value={formatInrPaise(s.completedRefundsPaise)} hint={plural(s.completedRefundsCount, "refund", "refunds") + " paid out"} />
              </div>
            </div>
            <div className="ad_grid ad_grid_fin" style={{ marginTop: 14 }}>
              <StatCard icon="check" tone="good" label="Paid" value={formatInrPaise(s.paidTotalPaise)} hint="Payment received" />
              <StatCard icon="clock" tone={s.awaitingPaymentTotalPaise > 0 ? "warn" : "default"} label="Awaiting payment" value={formatInrPaise(s.awaitingPaymentTotalPaise)} hint="Unpaid COD / UPI, not counted as collected" />
              <StatCard icon="x" tone={s.cancelledOrderCount > 0 ? "bad" : "default"} label="Cancelled order total" value={formatInrPaise(s.cancelledOrderCount ? s.cancelledTotalPaise : 0)} hint={`${plural(s.cancelledOrderCount, "order", "orders")} · never counted as sales`} />
            </div>
          </div>

          <div className="ad_dash_section">
            <div className="ad_dash_title"><h2>Orders</h2><span>{plural(d.orders.total, "order", "orders")} in this period</span></div>
            <div className="ad_grid ad_grid_5">
              <StatCard icon="bag" tone="info" label="Confirmed" value={d.orders.confirmed} href={link("/admin/orders", { status: "confirmed", ...rangeParams })} />
              <StatCard icon="package" tone="info" label="Packed" value={d.orders.packed} href={link("/admin/orders", { status: "packed", ...rangeParams })} />
              <StatCard icon="clock" tone="warn" label="Shipped" value={d.orders.shipped} href={link("/admin/orders", { status: "shipped", ...rangeParams })} />
              <StatCard icon="check" tone="good" label="Delivered" value={d.orders.delivered} href={link("/admin/orders", { status: "delivered", ...rangeParams })} />
              <StatCard icon="x" tone={d.orders.cancelled ? "bad" : "default"} label="Cancelled" value={d.orders.cancelled} href={link("/admin/orders", { status: "cancelled", ...rangeParams })} />
            </div>
          </div>

          <div className="ad_dash_section">
            <div className="ad_dash_title"><h2>Inventory</h2><span>Current stock position</span></div>
            <div className="ad_grid ad_grid_4">
              <StatCard icon="suits" label="Total suits" value={d.inventory.total} href="/admin/suits" hint={`${d.inventory.draft} draft · ${d.inventory.archived} archived`} />
              <StatCard icon="check" tone="good" label="Published" value={d.inventory.published} href={link("/admin/suits", { status: "published" })} hint="Visible to customers" />
              <StatCard icon="alert" tone={d.inventory.lowStock ? "warn" : "default"} label="Low stock" value={d.inventory.lowStock} href={link("/admin/suits", { stock: "low_stock" })} hint="1 to 3 left" />
              <StatCard icon="x" tone={d.inventory.outOfStock ? "bad" : "default"} label="Out of stock" value={d.inventory.outOfStock} href={link("/admin/suits", { stock: "out_of_stock" })} hint="Shown as Out of Stock" />
            </div>
          </div>

          <details className="ad_section ad_defs">
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>How these numbers are calculated</summary>
            <ul className="mt-3">{d.definitions.map((x) => <li key={x}>{x}</li>)}</ul>
            <a href="/admin/reports" className="admin_outline_btn admin_sm_btn mt-2"><AdminIcon name="download" size={14} />Download CSV / Excel reports</a>
          </details>
          {updatedAt && <p className="ad_note mt-3" role="status">Last updated {updatedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</p>}
        </>
      )}
    </section>
  );
}
