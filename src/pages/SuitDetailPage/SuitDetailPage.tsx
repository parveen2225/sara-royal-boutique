"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Col, Container, Row } from "react-bootstrap";
import SuitCard, { SuitPrice } from "@/components/shop/SuitCard";
import QuantityStepper from "@/components/shop/QuantityStepper";
import { fetchSuit, type PublicSuitDetail } from "@/lib/shopApi";
import { cartStore } from "@/lib/cartStore";
import { useCart, useShopSettings } from "@/lib/useShop";
import { buildOrderMessage, buildWhatsAppUrl } from "@/lib/suitWhatsapp";
import { suitPublicUrl } from "@/lib/siteUrl";
import ShareProductButton from "@/components/shop/ShareProductButton";
import TryOnPanel, { SparkleIcon } from "@/components/tryOn/TryOnPanel";
import { fetchTryOnConfig, type TryOnConfig } from "@/lib/tryOnApi";
import "@/components/tryOn/tryOn.scss";
import "@/components/shop/shop.scss";
import "./suitDetail.scss";

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

function SuitDetail({ suit }: { suit: PublicSuitDetail }) {
  const [active, setActive] = useState(0);
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
  const images = suit.fabricImages;
  const inCart = cart.items.find((i) => i.id === suit.id)?.quantity ?? 0;
  const safeQty = Math.max(1, Math.min(qty, suit.maxQuantity || 1));

  const addToCart = () => {
    const r = cartStore.add({ id: suit.id, sku: suit.sku, name: suit.name, image: suit.cover, unitPricePaise: suit.salePricePaise, maxQuantity: suit.maxQuantity }, safeQty);
    if (r.error === "out_of_stock") setMessage("This suit is out of stock.");
    else if (r.error === "cart_full") setMessage("Your cart is full. Please remove an item first.");
    else if (r.added === 0) setMessage(`You already have all ${suit.maxQuantity} available in your cart.`);
    else setMessage(r.capped ? `Added ${r.added}. Only ${suit.maxQuantity} are available in total.` : `Added ${r.added} to your cart.`);
  };

  const buyOnWhatsApp = () => {
    const text = buildOrderMessage([{ name: suit.name, sku: suit.sku, quantity: safeQty, unitPricePaise: suit.salePricePaise, url: suitPublicUrl(suit.id) }], settings.boutiqueName || undefined);
    const url = settings.whatsappNumber ? buildWhatsAppUrl(settings.whatsappNumber, text) : null;
    if (!url) return setMessage("WhatsApp ordering is not available right now.");
    window.open(url, "_blank", "noopener,noreferrer"); // opens a prefilled chat only: no order, no stock change, cart untouched
  };

  const waDisabled = !suit.inStock || (settings.ready && !settings.whatsappNumber);

  return (
    <div className="boutique_page shop_page shop_detail_page">
      <Container>
        <nav className="shop_crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>›</span><Link href="/collections">Collections</Link><span>›</span>{suit.name}</nav>
        <Row className="g-4 g-lg-5">
          <Col xs={12} md={6}>
            <div className="shop_gallery_main">
              {images[active] ? <Image src={images[active]} alt={`${suit.name} fabric photo ${active + 1}`} fill priority sizes="(max-width: 767px) 100vw, 50vw" style={{ objectFit: "cover" }} /> : <span className="shop_card_noimg">No photo</span>}
              {!suit.inStock && <span className="shop_badge shop_badge_out">Out of Stock</span>}
            </div>
            {images.length > 1 && (
              <div className="shop_thumbs" aria-label="Fabric photos">
                {images.map((src, i) => (
                  <button key={src} type="button" className={`shop_thumb ${i === active ? "is_on" : ""}`} onClick={() => setActive(i)} aria-label={`Show fabric photo ${i + 1}`} aria-current={i === active}>
                    <Image src={src} alt="" fill sizes="72px" style={{ objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            )}
            {suit.referenceImages.length > 0 && (
              <section className="shop_ref" aria-label="Stitched reference">
                <h3>Stitched / styling reference</h3>
                <p>Examples of how this fabric can look once stitched. These photos show styling only, not the unstitched fabric you will receive.</p>
                <div className="shop_thumbs">
                  {suit.referenceImages.map((src, i) => (
                    <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="shop_thumb" aria-label={`Open stitched reference ${i + 1}`}>
                      <Image src={src} alt={`Stitched reference ${i + 1}`} fill sizes="72px" style={{ objectFit: "cover" }} />
                    </a>
                  ))}
                </div>
              </section>
            )}
          </Col>

          <Col xs={12} md={6}>
            {suit.categories.length > 0 && <div className="shop_cats">{suit.categories.map((c) => <Link key={c.id} href={`/collections?category=${c.slug}`}>{c.name}</Link>)}</div>}
            <h1 className="shop_title">{suit.name}</h1>
            <p className="shop_sku">SKU: {suit.sku}</p>
            <SuitPrice {...suit} />
            <ul className="shop_specs">
              {suit.fabric && <li><strong>Fabric</strong>{suit.fabric}</li>}
              {suit.color && <li><strong>Color</strong>{suit.color}</li>}
              <li><strong>Availability</strong>{suit.inStock ? <span className="shop_stock_ok">In stock</span> : <span className="shop_stock_out">Out of Stock</span>}</li>
              <li><strong>Type</strong>Unstitched fabric</li>
            </ul>
            {suit.description && <p className="shop_desc">{suit.description}</p>}
            {suit.details && <p className="shop_desc">{suit.details}</p>}

            {suit.inStock && (
              <div className="d-flex align-items-center gap-3 flex-wrap mt-3">
                <QuantityStepper value={safeQty} max={suit.maxQuantity} onChange={setQty} />
                <span className="text-muted small">{suit.maxQuantity} available{inCart > 0 ? ` · ${inCart} in your cart` : ""}</span>
              </div>
            )}
            {message && <div className="shop_notice mt-3" role="status">{message} <Link href="/cart" className="shop_link_btn" style={{ color: "var(--boutique-gold)" }}>View cart</Link></div>}
            <div className="shop_actions">
              <button type="button" className="shop_btn shop_btn_solid" onClick={addToCart} disabled={!suit.inStock}>Add to Cart</button>
              <button type="button" className="shop_btn shop_btn_wa" onClick={buyOnWhatsApp} disabled={waDisabled}>Buy on WhatsApp</button>
            </div>
            {tryOn && (
              <>
                <button type="button" className="tryon_open_btn" onClick={() => setTryOnOpen(true)} aria-haspopup="dialog">
                  <SparkleIcon /> AI Try On Me
                </button>
                <p className="tryon_open_note">{suit.inStock ? "See this fabric stitched on you: an AI styling preview from your photo." : "Preview only: this suit is out of stock right now."}</p>
              </>
            )}
            <ShareProductButton id={suit.id} name={suit.name} sku={suit.sku} image={suit.cover} />
            {!suit.inStock && <p className="text-muted small mt-2">This suit is currently out of stock.</p>}
            {settings.ready && !settings.whatsappNumber && <p className="text-muted small mt-2">WhatsApp ordering is not available right now.</p>}
            <p className="text-muted small mt-3">Shipping charges are confirmed on WhatsApp for your PIN code. Payment: Cash on Delivery or Prepaid UPI.</p>
          </Col>
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
          shopping={{ onAddToCart: addToCart, onBuyWhatsApp: buyOnWhatsApp, addDisabled: !suit.inStock, waDisabled, note: message }}
        />
      )}
    </div>
  );
}
