"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Col, Container, Row } from "react-bootstrap";
import SuitCard, { SuitPrice } from "@/components/shop/SuitCard";
import QuantityStepper from "@/components/shop/QuantityStepper";
import { fetchSuit, type PublicSuitDetail, type PublicSuitVariant } from "@/lib/shopApi";
import { lineKey } from "@/lib/cartCore";
import { cartStore } from "@/lib/cartStore";
import { useCart, useShopSettings } from "@/lib/useShop";
import { buildOrderMessage, buildWhatsAppUrl, variantPageUrl } from "@/lib/suitWhatsapp";
import { suitPublicUrl } from "@/lib/siteUrl";
import SuitImageLightbox from "@/components/shop/SuitImageLightbox";
import ShareProductButton from "@/components/shop/ShareProductButton";
import TryOnPanel, { SparkleIcon } from "@/components/tryOn/TryOnPanel";
import { fetchTryOnConfig, type TryOnConfig } from "@/lib/tryOnApi";
import "@/components/tryOn/tryOn.scss";
import "@/components/shop/shop.scss";
import "@/components/shop/suitImageLightbox.scss";
import "./suitDetail.scss";

const ZoomIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2M11 8.5v5M8.5 11h5" /></svg>
);

type State = { id: string; suit?: PublicSuitDetail; status: "ok" | "notfound" | "error" };

export default function SuitDetailPage({ id }: { id: string }) {
  const [state, setState] = useState<State | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchSuit(id)
      .then((suit) => !cancelled && setState({ id, suit, status: "ok" }))
      .catch((e: { status?: number }) => !cancelled && setState({ id, status: e?.status === 404 ? "notfound" : "error" }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const current = state?.id === id ? state : null;
  if (!current) return <div className="boutique_page shop_page"><Container><div className="shop_skeleton" style={{ maxWidth: 420, margin: "2rem auto" }} aria-busy="true" /></Container></div>;
  if (current.status !== "ok" || !current.suit) {
    return (
      <div className="boutique_page shop_page"><Container>
        <div className="shop_state">
          <h1>{current.status === "notfound" ? "Suit not found" : "Something went wrong"}</h1>
          <p>{current.status === "notfound" ? "This suit is not available any more." : "We could not load this suit. Please try again."}</p>
          <Link href="/collections" className="shop_btn shop_btn_solid">Browse all suits</Link>
        </div>
      </Container></div>
    );
  }
  return <SuitDetail key={current.suit.id} suit={current.suit} />;
}

/** Variant to show first: the one in the link (?v=…, e.g. from a WhatsApp order), else the first in stock, else the first. */
function initialVariant(variants: PublicSuitVariant[]): string | null {
  if (variants.length === 0) return null;
  let fromLink: string | null = null;
  try { fromLink = new URLSearchParams(window.location.search).get("v"); } catch { /* not in a browser */ }
  return (variants.find((v) => v.id === fromLink) ?? variants.find((v) => v.inStock) ?? variants[0]).id;
}

function SuitDetail({ suit }: { suit: PublicSuitDetail }) {
  const variants = suit.variants ?? [];
  // Only rendered after the client-side fetch, so reading the URL here never differs from a server render.
  const [variantId, setVariantId] = useState<string | null>(() => initialVariant(variants));
  const [active, setActive] = useState(0);
  const [ratios, setRatios] = useState<Record<string, number>>({}); // photo URL -> width / height, once loaded
  const [broken, setBroken] = useState<Record<string, true>>({}); // photo URLs that failed to load
  const [preview, setPreview] = useState<number | null>(null); // open reference photo (index), null = closed
  const [zoom, setZoom] = useState<number | null>(null); // main photo enlarged in the lightbox (index), null = closed
  const zoomOpener = useRef<HTMLElement | null>(null);
  const swipeX = useRef<number | null>(null);
  const previewOpener = useRef<HTMLElement | null>(null); // the thumbnail that opened it: focus goes back there on close (Safari does not focus buttons on click)
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState("");
  const cart = useCart();
  const settings = useShopSettings();
  const [tryOn, setTryOn] = useState<TryOnConfig | null>(null);
  const [tryOnOpen, setTryOnOpen] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetchTryOnConfig().then((c) => { if (!cancelled && c.enabled) setTryOn(c); }).catch(() => undefined); // feature simply stays hidden
    return () => { cancelled = true; };
  }, []);
  // With variants, photos / availability / stock are the selected variant's; everything else is the suit's.
  const variant = variants.find((v) => v.id === variantId) ?? null;
  const variantNo = variant ? variants.indexOf(variant) + 1 : 0;
  // Photos of the selected design (else the suit). Empty URLs are dropped; a design without usable photos shows the suit's
  // own fabric photos rather than an empty gallery.
  const variantPhotos = (variant?.images ?? []).filter(Boolean);
  const images = variantPhotos.length ? variantPhotos : suit.fabricImages.filter(Boolean);
  // Never points past the list (e.g. right after switching design); if that photo failed to load, show the first one that works.
  const picked = Math.min(active, Math.max(0, images.length - 1));
  const firstWorking = images.findIndex((u) => !broken[u]);
  const shown = broken[images[picked]] && firstWorking >= 0 ? firstWorking : picked;
  const mainSrc = images[shown] ?? "";
  // Gallery box, sized ONCE per suit so it never changes width between designs (the design picker sits beside it and
  // must not move under the cursor): the widest photo proportions seen among the suit's photos, and room for the thumbnail
  // rail if any design has 2+ photos. Proportions come from photos that load right away (each design's cover in the picker,
  // or a plain suit's own photos), so the box is settled before anyone clicks; other photos are shown whole inside it.
  const galleryPhotos = variants.length ? variants.map((v) => v.cover) : suit.fabricImages;
  const knownRatios = galleryPhotos.map((u) => ratios[u]).filter((r): r is number => r > 0);
  const boxRatio = knownRatios.length ? Math.min(1.4, Math.max(0.5, ...knownRatios)) : 0.75;
  const reserveRail = variants.length ? variants.some((v) => v.images.filter(Boolean).length > 1) : suit.fabricImages.filter(Boolean).length > 1;
  const noteRatio = (src: string) => (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) setRatios((r) => (r[src] ? r : { ...r, [src]: img.naturalWidth / img.naturalHeight }));
  };
  const inStock = variant ? variant.inStock : suit.inStock;
  const maxQuantity = variant ? variant.maxQuantity : suit.maxQuantity;
  const inCart = cart.items.find((i) => lineKey(i) === lineKey({ id: suit.id, variantId: variant?.id }))?.quantity ?? 0;
  const safeQty = Math.max(1, Math.min(qty, maxQuantity || 1));

  // phones: swipe the main photo to the next / previous photo (same as tapping a thumbnail)
  const onSwipeStart = (e: React.TouchEvent) => { swipeX.current = e.touches[0]?.clientX ?? null; };
  const onSwipeEnd = (e: React.TouchEvent) => {
    const start = swipeX.current;
    swipeX.current = null;
    const dx = start === null ? 0 : (e.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(dx) < 50 || images.length < 2) return;
    setActive((i) => (i + (dx < 0 ? 1 : -1) + images.length) % images.length);
  };

  const chooseVariant = (v: PublicSuitVariant) => {
    if (v.id === variantId) return;
    setVariantId(v.id);
    setActive(0);
    setMessage("");
    // keep the address shareable (?v=…) without navigating or reloading
    try { const url = new URL(window.location.href); url.searchParams.set("v", v.id); window.history.replaceState(window.history.state, "", url); } catch { /* ignore */ }
  };

  const addToCart = () => {
    const r = cartStore.add({ id: suit.id, sku: suit.sku, name: suit.name, image: variant?.cover || suit.cover, unitPricePaise: suit.salePricePaise, maxQuantity, ...(variant ? { variantId: variant.id, variantCode: variant.code } : {}) }, safeQty);
    if (r.error === "out_of_stock") setMessage(variant ? "This design is out of stock." : "This suit is out of stock.");
    else if (r.error === "cart_full") setMessage("Your cart is full. Please remove an item first.");
    else if (r.added === 0) setMessage(`You already have all ${maxQuantity} available in your cart.`);
    else setMessage(r.capped ? `Added ${r.added}. Only ${maxQuantity} are available in total.` : `Added ${r.added} to your cart.`);
  };

  const buyOnWhatsApp = () => {
    const line = { name: suit.name, sku: suit.sku, quantity: safeQty, unitPricePaise: suit.salePricePaise, url: variantPageUrl(suitPublicUrl(suit.id), variant?.id), ...(variant ? { variant: variant.code, image: variant.cover } : {}) };
    const text = buildOrderMessage([line], settings.boutiqueName || undefined);
    const url = settings.whatsappNumber ? buildWhatsAppUrl(settings.whatsappNumber, text) : null;
    if (!url) return setMessage("WhatsApp ordering is not available right now.");
    window.open(url, "_blank", "noopener,noreferrer"); // opens a prefilled chat only: no order, no stock change, cart untouched
  };

  const waDisabled = !inStock || (settings.ready && !settings.whatsappNumber);

  return (
    <div className="boutique_page shop_page shop_detail_page">
      <Container>
        <nav className="shop_crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>›</span><Link href="/collections">Collections</Link><span>›</span>{suit.name}</nav>
        <Row className="g-4 g-lg-5">
          {/* Gallery: photo thumbnails change ONLY the photo (never the design, SKU, price or stock). Main photo first in the
              DOM (phones: photo, then a scrollable thumbnail row); from 992px the thumbnails stand in a column on its left. */}
          {/* desktop: the gallery column is as wide as its content (rail + photo box, below 45% of the row); details get the rest */}
          <Col xs={12} md={6} lg="auto" className="shop_pd_col">
            <div className={`shop_pd_gallery ${images.length > 1 ? "has_thumbs" : ""} ${reserveRail ? "reserve_rail" : ""}`} style={{ "--pd-ratio": boxRatio } as React.CSSProperties}>
              {/* One box per suit (see boxRatio): same size for every design; the photo is shown whole inside it. A photo that
                  fails to load shows a neutral notice instead of an empty gallery. */}
              <div className="shop_pd_stage">
                <div className="shop_gallery_main shop_pd_main" onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd}>
                  {mainSrc && !broken[mainSrc] ? (
                    <button type="button" className="shop_pd_zoom" onClick={(e) => { zoomOpener.current = e.currentTarget; setZoom(shown); }} aria-haspopup="dialog" aria-label={`Enlarge photo ${shown + 1} of ${images.length}`}>
                      <Image key={mainSrc} src={mainSrc} alt={`${suit.name}${variant ? ` design ${variantNo}` : ""} fabric photo ${shown + 1}`} fill priority sizes="(max-width: 767px) 100vw, 50vw" className="shop_pd_main_img"
                        onLoad={noteRatio(mainSrc)}
                        onError={() => setBroken((b) => ({ ...b, [mainSrc]: true }))} />
                      <span className="shop_pd_zoom_hint" aria-hidden="true"><ZoomIcon /></span>
                    </button>
                  ) : <span className="shop_card_noimg" role="img" aria-label="Photo unavailable">{mainSrc ? "Photo unavailable" : "No photo"}</span>}
                  {!inStock && <span className="shop_badge shop_badge_out">Out of Stock</span>}
                </div>
              </div>
              {images.length > 1 && (
                <div className="shop_pd_thumbs" role="group" aria-label="Fabric photos" key={variantId ?? "main"}>
                  {images.map((src, i) => (
                    <button key={src} type="button" className={`shop_pd_thumb ${i === shown ? "is_on" : ""}`} onClick={() => setActive(i)} aria-label={`Show fabric photo ${i + 1} of ${images.length}`} aria-pressed={i === shown}>
                      {broken[src] ? <span className="shop_pd_thumb_missing" aria-hidden="true">!</span>
                        : <Image src={src} alt="" fill sizes="72px" loading="eager" style={{ objectFit: "cover" }} onLoad={noteRatio(src)} onError={() => setBroken((b) => ({ ...b, [src]: true }))} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <SuitImageLightbox images={images} index={zoom} label={`${suit.name} fabric`} onIndexChange={(i) => { setZoom(i); setActive(i); }} onClose={() => { setZoom(null); requestAnimationFrame(() => zoomOpener.current?.focus({ preventScroll: true })); }} />
          </Col>

          <Col xs={12} md={6} lg>
            {suit.categories.length > 0 && <div className="shop_cats">{suit.categories.map((c) => <Link key={c.id} href={`/collections?category=${c.slug}`}>{c.name}</Link>)}</div>}
            <h1 className="shop_title">{suit.name}</h1>
            {/* a design has its own SKU (variant code); the suit's SKU otherwise */}
            <p className="shop_sku">SKU: <span data-testid="variant-code">{variant ? variant.code : suit.sku}</span></p>
            <SuitPrice {...suit} />
            {variants.length > 0 && (
              // Designs (same design, other colours): picking one switches its photos, SKU, availability and stock.
              <div className="shop_variants">
                <p className="shop_variants_label" id="shop-variants-label">Choose design <span>{variantNo} of {variants.length}</span></p>
                <div className="shop_variant_list" role="group" aria-labelledby="shop-variants-label">
                  {variants.map((v, i) => (
                    <button key={v.id} type="button" className={`shop_variant ${v.id === variantId ? "is_on" : ""} ${v.inStock ? "" : "is_out"}`} onClick={() => chooseVariant(v)}
                      aria-pressed={v.id === variantId} aria-label={`Design ${i + 1} of ${variants.length}${v.inStock ? "" : ", out of stock"}`}>
                      {v.cover && !broken[v.cover] ? <Image src={v.cover} alt="" fill sizes="72px" loading="eager" style={{ objectFit: "cover" }} onLoad={noteRatio(v.cover)} onError={() => setBroken((b) => ({ ...b, [v.cover]: true }))} /> : <span className="shop_card_noimg">{i + 1}</span>}
                      {!v.inStock && <span className="shop_variant_out" aria-hidden="true">Sold out</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <ul className="shop_specs">
              {suit.fabric && <li><strong>Fabric</strong>{suit.fabric}</li>}
              {suit.color && <li><strong>Color</strong>{suit.color}</li>}
              <li><strong>Availability</strong>{inStock ? <span className="shop_stock_ok">In stock</span> : <span className="shop_stock_out">Out of Stock</span>}</li>
              <li><strong>Type</strong>Unstitched fabric</li>
            </ul>
            {suit.description && <p className="shop_desc">{suit.description}</p>}
            {suit.details && <p className="shop_desc">{suit.details}</p>}

            {inStock && (
              <div className="d-flex align-items-center gap-3 flex-wrap mt-3">
                <QuantityStepper value={safeQty} max={maxQuantity} onChange={setQty} />
                <span className="text-muted small" data-testid="available-qty">{maxQuantity} available{inCart > 0 ? ` · ${inCart} in your cart` : ""}</span>
              </div>
            )}
            {message && <div className="shop_notice mt-3" role="status">{message} <Link href="/cart" className="shop_link_btn" style={{ color: "var(--boutique-gold)" }}>View cart</Link></div>}
            <div className="shop_actions">
              <button type="button" className="shop_btn shop_btn_solid" onClick={addToCart} disabled={!inStock}>Add to Cart</button>
              <button type="button" className="shop_btn shop_btn_wa" onClick={buyOnWhatsApp} disabled={waDisabled}>Buy on WhatsApp</button>
            </div>
            {tryOn && (
              <>
                <button type="button" className="tryon_open_btn" onClick={() => setTryOnOpen(true)} aria-haspopup="dialog">
                  <SparkleIcon /> AI Try On Me
                </button>
                <p className="tryon_open_note">{inStock ? "See this fabric stitched on you: an AI styling preview from your photo." : "Preview only: this suit is out of stock right now."}</p>
              </>
            )}
            <ShareProductButton id={suit.id} name={suit.name} sku={suit.sku} image={suit.cover} />
            {!inStock && <p className="text-muted small mt-2">{variant ? "This design is currently out of stock. Please choose another design." : "This suit is currently out of stock."}</p>}
            {settings.ready && !settings.whatsappNumber && <p className="text-muted small mt-2">WhatsApp ordering is not available right now.</p>}
            <p className="text-muted small mt-3">Shipping charges are confirmed on WhatsApp for your PIN code. Payment: Cash on Delivery or Prepaid UPI.</p>
          </Col>
          {suit.referenceImages.length > 0 && (
            <Col xs={12} md={6}>
              <section className="shop_ref" aria-label="Stitched reference">
                <h3>Stitched / styling reference</h3>
                <p>Examples of how this fabric can look once stitched. These photos show styling only, not the unstitched fabric you will receive.</p>
                <div className="shop_thumbs">
                  {suit.referenceImages.map((src, i) => (
                    // a button, not a link: the photo previews on this page (SuitImageLightbox) instead of navigating away
                    <button key={src} type="button" className="shop_thumb shop_ref_thumb" onClick={(e) => { previewOpener.current = e.currentTarget; setPreview(i); }} aria-haspopup="dialog" aria-label={`Preview stitched reference ${i + 1} of ${suit.referenceImages.length}`}>
                      <Image src={src} alt={`Stitched reference ${i + 1}`} fill sizes="72px" style={{ objectFit: "cover" }} />
                      <span className="shop_ref_zoom" aria-hidden="true"><ZoomIcon /></span>
                    </button>
                  ))}
                </div>
                <SuitImageLightbox images={suit.referenceImages} index={preview} label={`${suit.name} stitched reference`} onIndexChange={setPreview} onClose={() => { setPreview(null); requestAnimationFrame(() => previewOpener.current?.focus({ preventScroll: true })); }} />
              </section>
            </Col>
          )}
        </Row>

        {suit.related.length > 0 && (
          <section className="mt-5" aria-label="Related suits">
            <h2 className="shop_rail_title text-center mb-4">You may also like</h2>
            <Row className="g-3 g-xl-4">{suit.related.map((s) => <Col key={s.id} xs={6} md={3}><SuitCard suit={s} /></Col>)}</Row>
          </section>
        )}
      </Container>
      {tryOn && (
        <TryOnPanel
          show={tryOnOpen}
          onClose={() => setTryOnOpen(false)}
          config={tryOn}
          suit={{ id: suit.id, name: suit.name, sku: suit.sku, cover: suit.cover, fabric: suit.fabric, color: suit.color }}
          shopping={{ onAddToCart: addToCart, onBuyWhatsApp: buyOnWhatsApp, addDisabled: !inStock, waDisabled, note: message }}
        />
      )}
    </div>
  );
}
