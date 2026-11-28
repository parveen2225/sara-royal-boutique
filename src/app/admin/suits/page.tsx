"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Form } from "react-bootstrap";
import CommonTable from "@/components/common/ui/CommonTable/CommonTable";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import AdminDeleteConfirmModal from "@/components/admin/modal/AdminDeleteConfirmModal/AdminDeleteConfirmModal";
import StockModal from "@/components/admin/suits/StockModal";
import PageHeader from "@/components/admin/ui/PageHeader";
import EmptyState from "@/components/admin/ui/EmptyState";
import AdminIcon from "@/components/admin/ui/AdminIcon";
import RowActions from "@/components/admin/ui/RowActions";
import { useCurrentAdmin } from "@/lib/admin/useCurrentAdmin";
import { errorMessage, formatInr, suitsApi, type AdminSuit, type SuitCategory, type SuitListResult, type SuitStatus } from "@/lib/api/suitsApi";
import "@/components/admin/suits/suits.scss";

const FIELDS = [
  { label: "Suit", key: "name" },
  { label: "Price", key: "price" },
  { label: "Stock", key: "stock" },
  { label: "Categories", key: "categories" },
  { label: "Status", key: "status" },
  { label: "Actions", key: "actions" },
];

const STOCK_LABEL = { in_stock: "In stock", low_stock: "Low stock", out_of_stock: "Out of stock" } as const;
const DEFAULT_FILTERS = { q: "", status: "", category: "", stock: "", sort: "newest", limit: 20 };

function SuitsInner() {
  const sp = useSearchParams();
  const { user } = useCurrentAdmin();
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_FILTERS, status: sp?.get("status") ?? "", category: sp?.get("category") ?? "", stock: sp?.get("stock") ?? "" }));
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SuitListResult | null>(null);
  const [categories, setCategories] = useState<SuitCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [stockSuit, setStockSuit] = useState<AdminSuit | null>(null);
  const [deleteSuit, setDeleteSuit] = useState<AdminSuit | null>(null);

  const canStock = Boolean(user?.permissions.stock);
  const isOwner = user?.role === "owner";
  const filtersActive = Boolean(filters.q || filters.status || filters.category || filters.stock);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  useEffect(() => {
    suitsApi.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const [reloadTick, setReloadTick] = useState(0);
  const load = () => setReloadTick((t) => t + 1);

  useEffect(() => {
    let cancelled = false;
    suitsApi
      .list({ ...filters, q: debouncedQ, page })
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        setError("");
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(errorMessage(e, "Could not load suits."));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, debouncedQ, page, reloadTick]);

  const setFilter = (key: string, value: string | number) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };
  const clearFilters = () => { setPage(1); setDebouncedQ(""); setFilters({ ...DEFAULT_FILTERS }); };

  const act = async (fn: () => Promise<unknown>, success: string) => {
    setError(""); setNotice("");
    try {
      await fn();
      setNotice(success);
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  const changeStatus = (s: AdminSuit, status: SuitStatus, label: string) => act(() => suitsApi.setStatus(s.id, status), `${s.sku} ${label}.`);

  const filterKey = JSON.stringify({ ...filters, q: debouncedQ });
  const addButton = (
    <CommonButton role="link" to="/admin/suits/add" className="admin_primary_btn" svgIcon={<AdminIcon name="plus" size={16} />}>Add Suit</CommonButton>
  );

  return (
    <section>
      <PageHeader
        title="Unstitched Suits"
        count={result?.total ?? null}
        subtitle="Your fabric catalogue: photos, pricing, stock and what customers can see. Drafts and archived suits stay hidden from the shop."
        actions={addButton}
      />

      {error && <div className="admin_error_banner" role="alert"><AdminIcon name="alert" size={16} />{error}</div>}
      {notice && <div className="admin_success_banner" role="status"><AdminIcon name="check" size={16} />{notice}</div>}

      <div className="ad_toolbar" role="search">
        <label className="ad_search">
          <AdminIcon name="search" size={16} />
          <Form.Control aria-label="Search by name or SKU" placeholder="Search name or SKU" value={filters.q} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, q: e.target.value })); }} />
        </label>
        <Form.Select aria-label="Status" value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
          <option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
        </Form.Select>
        <Form.Select aria-label="Category" value={filters.category} onChange={(e) => setFilter("category", e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Form.Select>
        <Form.Select aria-label="Stock" value={filters.stock} onChange={(e) => setFilter("stock", e.target.value)}>
          <option value="">Any stock</option><option value="in_stock">In stock (4+)</option><option value="low_stock">Low stock (1–3)</option><option value="out_of_stock">Out of stock</option>
        </Form.Select>
        <Form.Select aria-label="Sort" value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)}>
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option>
        </Form.Select>
        <Form.Select aria-label="Items per page" value={filters.limit} onChange={(e) => setFilter("limit", Number(e.target.value))}>
          <option value={10}>10 per page</option><option value={20}>20 per page</option><option value={50}>50 per page</option>
        </Form.Select>
        {filtersActive && <button type="button" className="admin_outline_btn admin_sm_btn ad_toolbar_btn" onClick={clearFilters}><AdminIcon name="x" size={14} />Clear</button>}
      </div>

      <CommonTable
        key={filterKey}
        fields={FIELDS}
        loader={loading && !result}
        mobileCards
        pagination={(result?.pages ?? 1) > 1}
        totalPages={result?.pages ?? 1}
        totalDocs={result?.total ?? 0}
        onPageChange={({ selected }) => setPage(selected + 1)}
        empty={
          filtersActive ? (
            <EmptyState icon="search" title="No Matching Suits" text="Nothing fits those filters. Try a different search, or clear the filters to see the whole catalogue." action={<button type="button" className="admin_outline_btn" onClick={clearFilters}>Clear filters</button>} />
          ) : (
            <EmptyState icon="suits" title="No Unstitched Suits Yet" text="Add your first suit with its fabric photos, price and stock. It stays a private draft until you publish it." action={addButton} />
          )
        }
      >
        {(result?.items ?? []).map((s) => (
          <tr key={s.id}>
            <td>
              <div className="ad_cell_main">
                {s.fabricImages[0] ? (
                  <Image src={s.fabricImages[0].url} alt="" width={46} height={46} className="admin_table_image" unoptimized />
                ) : (
                  <span className="ad_noimg" aria-label="No photo"><AdminIcon name="image" size={18} /></span>
                )}
                <div>
                  <strong>{s.name}</strong>
                  <small>{s.sku}{s.featured && <> · <span className="admin_pill featured">Featured</span></>}</small>
                </div>
              </div>
            </td>
            <td>
              <span className="admin_price_badge">{formatInr(s.salePrice)}</span>
              {s.discountPercent > 0 && <small className="d-block"><span className="admin_old_price">{formatInr(s.originalPrice)}</span>{s.discountPercent}% off</small>}
            </td>
            <td>
              <span className="ad_num">{s.stock}</span> <span className={`admin_pill ${s.stockState}`}>{STOCK_LABEL[s.stockState]}</span>
            </td>
            <td>{s.categories.length ? s.categories.map((c) => c.name).join(", ") : <span className="text-muted">—</span>}</td>
            <td><span className={`admin_pill ${s.status}`}>{s.status}</span></td>
            <td className="ad_actions_cell">
              <div className="ad_row_actions">
                <CommonButton role="link" to={`/admin/suits/${s.id}/edit`} className="admin_outline_btn admin_sm_btn">Edit</CommonButton>
                <RowActions
                  label={`More actions for ${s.sku}`}
                  actions={[
                    { label: "Publish", hidden: s.status !== "draft", onClick: () => changeStatus(s, "published", "published") },
                    { label: "Unpublish (move to Draft)", hidden: s.status !== "published", onClick: () => changeStatus(s, "draft", "moved to Draft") },
                    { label: "Archive", hidden: s.status === "archived", onClick: () => changeStatus(s, "archived", "archived") },
                    { label: "Restore to Draft", hidden: s.status !== "archived", onClick: () => changeStatus(s, "draft", "restored to Draft") },
                    { label: s.featured ? "Remove from featured" : "Mark as featured", onClick: () => act(() => suitsApi.update(s.id, { featured: !s.featured }), s.featured ? `${s.sku} removed from featured.` : `${s.sku} marked featured.`) },
                    { label: "Adjust stock…", hidden: !canStock, onClick: () => setStockSuit(s) },
                    { label: "", divider: true, hidden: !isOwner },
                    { label: "Delete permanently…", tone: "danger", hidden: !isOwner, onClick: () => setDeleteSuit(s) },
                  ]}
                />
              </div>
            </td>
          </tr>
        ))}
      </CommonTable>

      <StockModal suit={stockSuit} onClose={() => setStockSuit(null)} onChanged={(r) => { setNotice(`Stock updated: ${(r.variantId && stockSuit?.variants?.find((v) => v.id === r.variantId)?.code) || stockSuit?.sku || ""} ${r.previousQty} → ${r.stock}.`); load(); }} />
      <AdminDeleteConfirmModal
        show={!!deleteSuit}
        heading="Permanently delete suit"
        message={deleteSuit ? `Permanently delete ${deleteSuit.sku} “${deleteSuit.name}” and its images? This cannot be undone, and the SKU will never be reused. Consider archiving instead.` : ""}
        confirmLabel="Delete permanently"
        onClose={() => setDeleteSuit(null)}
        onConfirm={() => {
          const s = deleteSuit;
          setDeleteSuit(null);
          if (s) act(() => suitsApi.remove(s.id), `${s.sku} deleted.`);
        }}
      />
    </section>
  );
}

export default function SuitsAdminPage() {
  return (
    <Suspense fallback={null}>
      <SuitsInner />
    </Suspense>
  );
}
