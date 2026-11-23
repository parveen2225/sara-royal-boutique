"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Col, Container, Row } from "react-bootstrap";
import SuitCard from "@/components/shop/SuitCard";
import { fetchSuitCategories, fetchSuits, suitQueryString, type PublicCategory, type SuitList } from "@/lib/shopApi";
import "@/components/shop/shop.scss";

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];
const PAGE_SIZE = 12;

/** Unstitched suits only. Search, category, sort and page live in the URL so links and the back button work. */
export default function SuitCollectionsPage() {
  const router = useRouter();
  const pathname = usePathname() ?? "/collections";
  const params = useSearchParams();
  const q = params?.get("q") ?? "";
  const category = params?.get("category") ?? "";
  const sort = params?.get("sort") ?? "newest";
  const page = Math.max(1, Number(params?.get("page") ?? 1) || 1);

  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [result, setResult] = useState<{ key: string; data?: SuitList; error?: string }>({ key: "" });
  const [search, setSearch] = useState(q);
  const lastQ = useRef(q);

  const key = suitQueryString({ q, category, sort, page, limit: PAGE_SIZE });
  const loading = result.key !== key;

  const push = (next: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams(params?.toString() ?? "");
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "" || (k === "sort" && v === "newest") || (k === "page" && Number(v) <= 1)) p.delete(k);
      else p.set(k, String(v));
    }
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  useEffect(() => {
    let cancelled = false;
    fetchSuitCategories().then((c) => !cancelled && setCategories(c)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchSuits({ q, category, sort, page, limit: PAGE_SIZE })
      .then((data) => !cancelled && setResult({ key, data }))
      .catch((e) => !cancelled && setResult({ key, error: e instanceof Error ? e.message : "Could not load suits." }));
    return () => {
      cancelled = true;
    };
  }, [key, q, category, sort, page]);

  // Debounce typing into the search box (320 ms) before it touches the URL.
  useEffect(() => {
    if (search === lastQ.current) return;
    const t = setTimeout(() => {
      lastQ.current = search;
      push({ q: search.trim(), page: 1 });
    }, 320);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const data = result.key === key ? result.data : undefined;
  const error = result.key === key ? result.error : undefined;

  return (
    <div className="boutique_page shop_page">
      <Container>
        <header className="shop_hero">
          <span className="shop_eyebrow">✦ Unstitched Collection</span>
          <h1>Unstitched Ladies Suits</h1>
          <p>Premium fabrics, delivered all over India. Order on WhatsApp, and we can stitch it for you too.</p>
        </header>

        <div className="shop_toolbar" role="search">
          <input type="search" placeholder="Search by name or SKU" aria-label="Search by name or SKU" value={search} onChange={(e) => setSearch(e.target.value)} maxLength={80} />
          <select aria-label="Category" value={category} onChange={(e) => push({ category: e.target.value, page: 1 })}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
          <select aria-label="Sort by" value={sort} onChange={(e) => push({ sort: e.target.value, page: 1 })}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {categories.length > 0 && (
          <div className="shop_chips" aria-label="Filter by category">
            <button type="button" className={`shop_chip ${category === "" ? "is_on" : ""}`} onClick={() => push({ category: "", page: 1 })}>All</button>
            {categories.map((c) => (
              <button key={c.id} type="button" className={`shop_chip ${category === c.slug ? "is_on" : ""}`} onClick={() => push({ category: c.slug, page: 1 })}>{c.name}</button>
            ))}
          </div>
        )}

        {error && <div className="shop_error" role="alert">{error} <button type="button" className="shop_link_btn" onClick={() => setResult({ key: "" })}>Try again</button></div>}

        {loading && !error ? (
          <Row className="g-3 g-xl-4" aria-busy="true">
            {Array.from({ length: 8 }, (_, i) => <Col key={i} xs={6} md={4} lg={3}><div className="shop_skeleton" /></Col>)}
          </Row>
        ) : data && data.items.length > 0 ? (
          <>
            <p className="shop_count">Showing {data.items.length} of {data.total} {data.total === 1 ? "suit" : "suits"}</p>
            <Row className="g-3 g-xl-4">
              {data.items.map((s) => <Col key={s.id} xs={6} md={4} lg={3}><SuitCard suit={s} /></Col>)}
            </Row>
            {data.pages > 1 && (
              <nav className="shop_pager" aria-label="Pagination">
                <button type="button" className="shop_btn" disabled={page <= 1} onClick={() => push({ page: page - 1 })}>← Previous</button>
                <span>Page {data.page} of {data.pages}</span>
                <button type="button" className="shop_btn" disabled={page >= data.pages} onClick={() => push({ page: page + 1 })}>Next →</button>
              </nav>
            )}
          </>
        ) : !error ? (
          <div className="shop_state">
            <p>{q || category ? "No suits match your search." : "New unstitched suits are coming soon."}</p>
            {(q || category) && <button type="button" className="shop_btn" onClick={() => { setSearch(""); lastQ.current = ""; router.replace(pathname, { scroll: false }); }}>Clear filters</button>}
          </div>
        ) : null}
      </Container>
    </div>
  );
}
