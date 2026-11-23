"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Form } from "react-bootstrap";
import CommonTable from "@/components/common/ui/CommonTable/CommonTable";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import PageHeader from "@/components/admin/ui/PageHeader";
import EmptyState from "@/components/admin/ui/EmptyState";
import AdminIcon from "@/components/admin/ui/AdminIcon";
import { errorMessage } from "@/lib/api/suitsApi";
import { ordersApi, type OrderList } from "@/lib/api/ordersApi";
import { formatInrPaise } from "@/lib/money";
import "@/components/admin/suits/suits.scss";

const FIELDS = [
  { label: "Order", key: "order" },
  { label: "Customer", key: "customer" },
  { label: "Items", key: "items" },
  { label: "Total", key: "total" },
  { label: "Payment", key: "payment" },
  { label: "Status", key: "status" },
  { label: "Actions", key: "actions" },
];
const DEFAULTS = { q: "", status: "", payment: "", method: "", from: "", to: "", sort: "newest", limit: 20 };

function OrdersInner() {
  const sp = useSearchParams();
  const [filters, setFilters] = useState(() => ({ ...DEFAULTS, status: sp?.get("status") ?? "", payment: sp?.get("payment") ?? "", method: sp?.get("method") ?? "", from: sp?.get("from") ?? "", to: sp?.get("to") ?? "" }));
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<OrderList | null>(null);
  const [error, setError] = useState("");
  const filtersActive = Boolean(filters.q || filters.status || filters.payment || filters.method || filters.from || filters.to);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  useEffect(() => {
    let cancelled = false;
    ordersApi
      .list({ ...filters, q: debouncedQ, page })
      .then((r) => { if (!cancelled) { setResult(r); setError(""); } })
      .catch((e) => !cancelled && setError(errorMessage(e, "Could not load orders.")));
    return () => { cancelled = true; };
  }, [filters, debouncedQ, page]);

  const setFilter = (k: string, v: string | number) => { setPage(1); setFilters((f) => ({ ...f, [k]: v })); };
  const clearFilters = () => { setPage(1); setDebouncedQ(""); setFilters({ ...DEFAULTS }); };
  const newOrder = <CommonButton role="link" to="/admin/orders/new" className="admin_primary_btn" svgIcon={<AdminIcon name="plus" size={16} />}>New Order</CommonButton>;

  return (
    <section>
      <PageHeader
        title="Suit Orders"
        count={result?.total ?? null}
        subtitle="Enter an order here after the customer confirms on WhatsApp. Saving a confirmed order deducts the stock straight away."
        actions={newOrder}
      />
      {error && <div className="admin_error_banner" role="alert"><AdminIcon name="alert" size={16} />{error}</div>}

      <div className="ad_toolbar" role="search">
        <label className="ad_search">
          <AdminIcon name="search" size={16} />
          <Form.Control aria-label="Search orders" placeholder="Order ID, name, phone or SKU" value={filters.q} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, q: e.target.value })); }} />
        </label>
        <Form.Select aria-label="Status" value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
          <option value="">All statuses</option><option value="confirmed">Confirmed</option><option value="packed">Packed</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option>
        </Form.Select>
        <Form.Select aria-label="Payment status" value={filters.payment} onChange={(e) => setFilter("payment", e.target.value)}>
          <option value="">Any payment</option><option value="pending">Payment pending</option><option value="paid">Paid</option>
        </Form.Select>
        <Form.Select aria-label="Payment method" value={filters.method} onChange={(e) => setFilter("method", e.target.value)}>
          <option value="">COD or UPI</option><option value="cod">Cash on Delivery</option><option value="upi">Prepaid UPI</option>
        </Form.Select>
        <label className="ad_date"><span>From</span><Form.Control aria-label="From date" type="date" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} /></label>
        <label className="ad_date"><span>To</span><Form.Control aria-label="To date" type="date" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} /></label>
        <Form.Select aria-label="Sort" value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)}>
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="total_desc">Total: high to low</option><option value="total_asc">Total: low to high</option>
        </Form.Select>
        <Form.Select aria-label="Items per page" value={filters.limit} onChange={(e) => setFilter("limit", Number(e.target.value))}>
          <option value={10}>10 per page</option><option value={20}>20 per page</option><option value={50}>50 per page</option>
        </Form.Select>
        {filtersActive && <button type="button" className="admin_outline_btn admin_sm_btn ad_toolbar_btn" onClick={clearFilters}><AdminIcon name="x" size={14} />Clear</button>}
      </div>

      <CommonTable
        key={JSON.stringify({ ...filters, q: debouncedQ })}
        fields={FIELDS}
        loader={!result && !error}
        mobileCards
        pagination={(result?.pages ?? 1) > 1}
        totalPages={result?.pages ?? 1}
        totalDocs={result?.total ?? 0}
        onPageChange={({ selected }) => setPage(selected + 1)}
        empty={
          filtersActive ? (
            <EmptyState icon="search" title="No Matching Orders" text="No orders fit those filters. Widen the dates or clear the filters." action={<button type="button" className="admin_outline_btn" onClick={clearFilters}>Clear filters</button>} />
          ) : (
            <EmptyState icon="bag" title="No Orders Yet" text="Orders appear here once you record them. When a customer confirms on WhatsApp, add the order: it deducts stock, tracks shipping and lets you send status updates." action={newOrder} />
          )
        }
      >
        {(result?.items ?? []).map((o) => (
          <tr key={o.id} className={o.status === "confirmed" || o.status === "packed" ? "is_attention" : ""}>
            <td><strong>{o.orderId}</strong><small className="d-block">{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</small></td>
            <td><strong>{o.customer.name}</strong><small className="d-block">+{o.customer.phone}</small></td>
            <td>
              <span className="ad_num">{o.items.reduce((n, i) => n + i.quantity, 0)}</span> <small>{o.items.length === 1 ? o.items[0].sku : `${o.items.length} suits`}</small>
            </td>
            <td><span className="ad_num">{formatInrPaise(o.totalPaise)}</span></td>
            <td><span className={`admin_pill ${o.paymentMethod}`}>{o.paymentMethod}</span> <span className={`admin_pill ${o.paymentStatus}`}>{o.paymentStatus}</span></td>
            <td><span className={`admin_pill ${o.status}`}>{o.status}</span></td>
            <td className="ad_actions_cell"><CommonButton role="link" to={`/admin/orders/${o.id}`} className="admin_outline_btn admin_sm_btn">View order</CommonButton></td>
          </tr>
        ))}
      </CommonTable>
    </section>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersInner />
    </Suspense>
  );
}
