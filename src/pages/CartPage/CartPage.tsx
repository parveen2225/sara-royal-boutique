"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Col, Container, Row } from "react-bootstrap";
import QuantityStepper from "@/components/shop/QuantityStepper";
import ShoppingBagIcon from "@/components/shop/ShoppingBagIcon";
import { cartStore } from "@/lib/cartStore";
import { useCart, useShopSettings } from "@/lib/useShop";
import { applyValidation, lineTotalPaise, type CartIssue } from "@/lib/cartCore";
import { validateCartOnServer } from "@/lib/shopApi";
import { formatInrPaise } from "@/lib/money";
import { buildOrderMessage, buildWhatsAppUrl } from "@/lib/suitWhatsapp";
import { suitPublicUrl } from "@/lib/siteUrl";
import "@/components/shop/shop.scss";

const ISSUE_TEXT: Record<CartIssue, string> = {
  not_found: "This suit no longer exists. Please remove it.",
  unavailable: "This suit is no longer available. Please remove it.",
  out_of_stock: "Out of stock. Please remove it to continue.",
  insufficient_stock: "Not enough stock for your quantity; we reduced it.",
};

export default function CartPage() {
  const { items, count, subtotalPaise } = useCart();
  const settings = useShopSettings();
  const [issues, setIssues] = useState<Record<string, CartIssue>>({});
  const [notes, setNotes] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  // Re-check prices, stock and availability whenever the cart page opens.
  const idsKey = items.map((i) => `${i.id}:${i.quantity}`).join(",");
  const [checkedKey, setCheckedKey] = useState("");
  useEffect(() => {
    if (items.length === 0 || checkedKey === idsKey) return;
    let cancelled = false;
    validateCartOnServer(items.map((i) => ({ id: i.id, quantity: i.quantity })))
      .then((v) => {
        if (cancelled) return;
        const r = applyValidation(cartStore.getSnapshot(), v.items);
        setIssues(r.issues);
        setNotes(r.changes);
        setError("");
        setCheckedKey(r.items.map((i) => `${i.id}:${i.quantity}`).join(","));
        cartStore.replaceAll(r.items);
      })
      .catch(() => !cancelled && setError("We could not refresh prices and stock. Check your connection and try again."));
    return () => {
      cancelled = true;
    };
  }, [idsKey, checkedKey, items]);

  const hasIssues = Object.values(issues).some((i) => i !== "insufficient_stock"); // a reduced quantity is just a notice

  const checkout = async () => {
    setError("");
    if (!settings.whatsappNumber) return setError("WhatsApp ordering is not available right now.");
    // Open the tab inside the click (popup blockers allow this), then point it at WhatsApp once validation passes.
    const tab = window.open("", "_blank");
    setChecking(true);
    try {
      const v = await validateCartOnServer(items.map((i) => ({ id: i.id, quantity: i.quantity })));
      const r = applyValidation(cartStore.getSnapshot(), v.items);
      cartStore.replaceAll(r.items);
      setIssues(r.issues);
      setNotes(r.changes);
      if (!r.canCheckout) {
        tab?.close();
        setError("Please review the highlighted items before checking out.");
        return;
      }
      const text = buildOrderMessage(r.items.map((i) => ({ name: i.name, sku: i.sku, quantity: i.quantity, unitPricePaise: i.unitPricePaise, url: suitPublicUrl(i.id) })), settings.boutiqueName || undefined);
      const url = buildWhatsAppUrl(settings.whatsappNumber, text);
      if (!url) throw new Error("bad number");
      if (tab) { tab.opener = null; tab.location.href = url; } else window.location.href = url;
      // The cart is deliberately NOT cleared: nothing is ordered until you send the message and we confirm.
    } catch {
      tab?.close();
      setError("We could not prepare your WhatsApp order. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="boutique_page shop_page"><Container>
        <section className="shop_empty_bag" aria-labelledby="empty-bag-title">
          <div className="shop_empty_art" aria-hidden="true">
            <span className="shop_empty_ring" />
            <ShoppingBagIcon size={44} strokeWidth={1.3} />
          </div>
          <p className="shop_eyebrow">Sara Royal Boutique</p>
          <h1 id="empty-bag-title">Your Shopping Bag Is Empty</h1>
          <span className="shop_empty_divider" aria-hidden="true"><i /></span>
          <p className="shop_empty_text">Discover beautiful unstitched suits and find your next favourite look.</p>
          <div className="shop_empty_actions">
            <Link href="/collections" className="shop_btn shop_btn_solid shop_empty_cta">
              Explore Collection
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
            <Link href="/stitching" className="shop_empty_link">Explore Stitching Designs</Link>
          </div>
        </section>
      </Container></div>
    );
  }

  return (
    <div className="boutique_page shop_page">
      <Container>
        <header className="shop_hero" style={{ textAlign: "left", padding: "0 0 1rem" }}><h1>Your Cart <small className="text-muted" style={{ fontSize: "1rem" }}>({count} {count === 1 ? "item" : "items"})</small></h1></header>
        {error && <div className="shop_error" role="alert">{error}</div>}
        {notes.length > 0 && <div className="shop_notice" role="status"><strong>Updated:</strong> {notes.join(" · ")}</div>}
        <Row className="g-4">
          <Col lg={8}>
            {items.map((i) => (
              <div key={i.id} className={`shop_cart_line ${issues[i.id] ? "has_issue" : ""}`}>
                <div className="shop_cart_img">{i.image && <Image src={i.image} alt={i.name} fill sizes="84px" style={{ objectFit: "cover" }} />}</div>
                <div className="shop_cart_info">
                  <h3><Link href={`/suits/${i.id}`}>{i.name}</Link></h3>
                  <p className="shop_card_meta">{i.sku} · {formatInrPaise(i.unitPricePaise)} each</p>
                  {issues[i.id] && <p className="shop_issue" role="alert">{ISSUE_TEXT[issues[i.id]]}</p>}
                  <div className="shop_cart_row">
                    {i.maxQuantity > 0 ? <QuantityStepper value={i.quantity} max={i.maxQuantity} onChange={(n) => cartStore.setQuantity(i.id, n)} label={`Quantity of ${i.name}`} /> : <span className="shop_stock_out">Unavailable</span>}
                    <strong>{formatInrPaise(lineTotalPaise(i))}</strong>
                    <button type="button" className="shop_link_btn" onClick={() => cartStore.remove(i.id)} aria-label={`Remove ${i.name}`}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-3">
              {confirmClear ? (
                <span>Remove everything? <button type="button" className="shop_link_btn" onClick={() => { cartStore.clear(); setConfirmClear(false); setIssues({}); }}>Yes, clear cart</button> · <button type="button" className="shop_link_btn" style={{ color: "inherit" }} onClick={() => setConfirmClear(false)}>Cancel</button></span>
              ) : (
                <button type="button" className="shop_link_btn" onClick={() => setConfirmClear(true)}>Clear cart</button>
              )}
            </div>
          </Col>
          <Col lg={4}>
            <aside className="shop_summary" aria-label="Order summary">
              <div className="shop_summary_row"><span>Products total</span><span className="shop_total">{formatInrPaise(subtotalPaise)}</span></div>
              <small>Shipping charges are not included. We confirm them on WhatsApp for your PIN code. Pay by Cash on Delivery or Prepaid UPI. Nothing is ordered until you send the message and we confirm.</small>
              <button type="button" className="shop_btn shop_btn_wa shop_btn_block" onClick={checkout} disabled={checking || hasIssues || (settings.ready && !settings.whatsappNumber)}>{checking ? "Checking stock…" : "WhatsApp Checkout"}</button>
              {settings.ready && !settings.whatsappNumber && <p className="text-muted small mt-2 mb-0">WhatsApp ordering is not available right now.</p>}
              <Link href="/collections" className="shop_btn shop_btn_block mt-2">Continue shopping</Link>
            </aside>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
