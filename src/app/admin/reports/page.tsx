"use client";

import { useState } from "react";
import { Form } from "react-bootstrap";
import { exportUrl, type RangeQuery } from "@/lib/api/adminApi";
import { REPORT_DEFINITIONS } from "@/lib/reportDefinitions";
import "@/components/admin/suits/suits.scss";
import PageHeader from "@/components/admin/ui/PageHeader";

const TYPES = [
  { key: "orders", label: "Orders", hint: "One row per order: customer, products, SKUs, quantities, status, payment, totals." },
  { key: "sales", label: "Sales", hint: "One row per day: product subtotal, delivery charges, confirmed sales, cancelled orders, completed refunds, net sales." },
  { key: "refunds", label: "Refunds", hint: "Refund ID, order, amount, method, date, status and the UTR / reference." },
  { key: "payments", label: "Payment methods", hint: "COD vs UPI with payment status and amounts (Excel adds a summary sheet)." },
];

export default function ReportsPage() {
  const [range, setRange] = useState<RangeQuery["range"]>("30d");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const q: RangeQuery = range === "custom" ? { range, from, to } : { range };
  const ready = range !== "custom" || (from && to && from <= to);
  return (
    <section>
      <PageHeader title="Reports & Exports" subtitle="Download CSV or Excel for any date range (India time). Customer phone numbers are masked unless you are the Owner, and delivery addresses are never exported." />
      <div className="admin_card admin_card_pad mb-3">
        <div className="admin_suit_filters" style={{ marginBottom: 0 }}>
          <Form.Select aria-label="Date range" value={range} onChange={(e) => setRange(e.target.value as RangeQuery["range"])}>
            <option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="custom">Custom range</option>
          </Form.Select>
          {range === "custom" && (<><Form.Control aria-label="From date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><Form.Control aria-label="To date" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></>)}
        </div>
        {!ready && <p className="small text-danger mt-2 mb-0">Choose a valid from and to date.</p>}
      </div>
      <div className="admin_two_col">
        {TYPES.map((t) => (
          <div key={t.key} className="admin_card admin_card_pad">
            <h6>{t.label}</h6>
            <p className="small text-muted">{t.hint}</p>
            <div className="admin_row_actions">
              {(["csv", "xlsx"] as const).map((f) => (
                <a key={f} className={`admin_outline_btn admin_sm_btn ${ready ? "" : "disabled"}`} aria-disabled={!ready} href={ready ? exportUrl(t.key, f, q) : undefined} download>{f === "csv" ? "Download CSV" : "Download Excel (.xlsx)"}</a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="admin_card admin_card_pad mt-3"><h6>Definitions</h6><ul className="small mb-0">{REPORT_DEFINITIONS.map((x) => <li key={x}>{x}</li>)}</ul></div>
    </section>
  );
}
