"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "react-bootstrap";
import QuantityStepper from "@/components/shop/QuantityStepper";
import ShoppingBagIcon from "@/components/shop/ShoppingBagIcon";
import { cartStore } from "@/lib/cartStore";
import { useCart, useShopSettings } from "@/lib/useShop";
import { applyValidation, lineKey, lineTotalPaise, type CartIssue, type CartItem } from "@/lib/cartCore";
import { validateCartOnServer } from "@/lib/shopApi";
import { formatInrPaise } from "@/lib/money";
import { buildOrderMessage, buildWhatsAppUrl, variantPageUrl } from "@/lib/suitWhatsapp";
import { suitPublicUrl } from "@/lib/siteUrl";
import { BoutiqueWhatsAppIcon } from "@/assets/icons/svgIcon";
import "@/components/shop/shop.scss";
import "./cart.scss";

const ISSUE_TEXT: Record<CartIssue, string> = {
  not_found: "This suit no longer exists. Please remove it.",
  unavailable: "This suit is no longer available. Please remove it.",
  out_of_stock: "Out of stock. Please remove it to continue.",
  insufficient_stock: "Not enough stock for your quantity; we reduced it.",
};

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12.2A1.8 1.8 0 008.8 21h6.4a1.8 1.8 0 001.8-1.8L18 7M9 7V4.8A.8.8 0 019.8 4h4.4a.8.8 0 01.8.8V7" /></svg>
);
const CheckDot = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" /><path d="M8.2 12.4l2.5 2.5 5-5.3" /></svg>
);
const AlertDot = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.4v.1" /></svg>
);

// A line is a suit, or one image variant of a suit (its own stock); variant lines carry the variant to the server and WhatsApp.
const toServer = (i: CartItem) => ({ id: i.id, ...(i.variantId ? { variantId: i.variantId } : {}), quantity: i.quantity });
const itemHref = (i: CartItem) => (i.variantId ? `/suits/${i.id}?v=${encodeURIComponent(i.variantId)}` : `/suits/${i.id}`);

export default function CartPage() {
  const { items, count, subtotalPaise } = useCart();
  const settings = useShopSettings();
  const [issues, setIssues] = useState<Record<string, CartIssue>>({});
  const [notes, setNotes] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  // Re-check prices, stock and availability whenever the cart page opens.
  const idsKey = items.map((i) => `${lineKey(i)}:${i.quantity}`).join(",");
  const [checkedKey, setCheckedKey] = useState("");
  useEffect(() => {
    if (items.length === 0 || checkedKey === idsKey) return;
    let cancelled = false;
    validateCartOnServer(items.map(toServer))
      .then((v) => {
        if (cancelled) return;
        const r = applyValidation(cartStore.getSnapshot(), v.items);
        setIssues(r.issues);
        setNotes(r.changes);
        setError("");
        setCheckedKey(r.items.map((i) => `${lineKey(i)}:${i.quantity}`).join(","));
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
      const v = await validateCartOnServer(items.map(toServer));
      const r = applyValidation(cartStore.getSnapshot(), v.items);
      cartStore.replaceAll(r.items);
      setIssues(r.issues);
      setNotes(r.changes);
      if (!r.canCheckout) {
        tab?.close();
        setError("Please review the highlighted items before checking out.");
        return;
      }
      const text = buildOrderMessage(r.items.map((i) => ({ name: i.name, sku: i.sku, quantity: i.quantity, unitPricePaise: i.unitPricePaise, url: variantPageUrl(suitPublicUrl(i.id), i.variantId), ...(i.variantId ? { variant: i.variantCode || undefined, image: i.image } : {}) })), settings.boutiqueName || undefined);
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
    <div className="boutique_page shop_page cart_page">
      <Container>
        <header className="cart_head">
          <div>
            <p className="shop_eyebrow">Sara Royal Boutique</p>
            <h1>Your Cart</h1>
          </div>
          <span className="cart_count" aria-label={`${count} ${count === 1 ? "item" : "items"} in your cart`}>{count} {count === 1 ? "item" : "items"}</span>
        </header>
        {error && <div className="shop_error" role="alert">{error}</div>}
        {notes.length > 0 && <div className="shop_notice" role="status"><strong>Updated:</strong> {notes.join(" · ")}</div>}

        <div className="cart_layout">
          <section aria-label="Cart items">
            <ul className="cart_list">
              {items.map((i) => { const key = lineKey(i); return (
                <li key={key} className={`cart_item ${issues[key] ? "has_issue" : ""}`}>
                  <Link href={itemHref(i)} className="cart_img" tabIndex={-1} aria-hidden="true">
                    {i.image && <Image src={i.image} alt="" fill sizes="(max-width: 767px) 96px, 120px" />}
                  </Link>
                  <div className="cart_info">
                    <h3 className="cart_name"><Link href={itemHref(i)}>{i.name}</Link></h3>
                    <p className="cart_meta"><span className="cart_sku">{i.variantId && i.variantCode ? `Design ${i.variantCode}` : i.sku}</span><span className="cart_unit"><strong>{formatInrPaise(i.unitPricePaise)}</strong> each</span></p>
                    {issues[key] && <p className="cart_issue" role="alert"><AlertDot /><span>{ISSUE_TEXT[issues[key]]}</span></p>}
                    {i.maxQuantity > 0 ? <QuantityStepper value={i.quantity} max={i.maxQuantity} onChange={(n) => cartStore.setQuantity(key, n)} label={`Quantity of ${i.name}`} /> : <span className="cart_unavailable">Unavailable</span>}
                  </div>
                  <div className="cart_side">
                    <div className="cart_line_total"><span>Subtotal</span><strong>{formatInrPaise(lineTotalPaise(i))}</strong></div>
                    <button type="button" className="cart_remove" onClick={() => cartStore.remove(key)} aria-label={`Remove ${i.name}${i.variantCode ? ` (${i.variantCode})` : ""}`}><TrashIcon /> Remove</button>
                  </div>
                </li>
              ); })}
            </ul>
            <div className="cart_footer">
              {confirmClear ? (
                <div className="cart_confirm" role="group" aria-label="Confirm clearing the cart">
                  <p>Remove all {count} {count === 1 ? "item" : "items"} from your cart?</p>
                  <div className="cart_confirm_actions">
                    <button type="button" className="cart_btn_danger" onClick={() => { cartStore.clear(); setConfirmClear(false); setIssues({}); }}>Yes, clear cart</button>
                    <button type="button" className="cart_btn_ghost" onClick={() => setConfirmClear(false)}>Keep items</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="cart_remove cart_clear" onClick={() => setConfirmClear(true)}><TrashIcon /> Clear cart</button>
              )}
            </div>
          </section>

          <aside className="cart_summary" aria-label="Order summary">
            <h2>Order summary</h2>
            <dl className="cart_rows">
              <div className="cart_row"><dt>Items</dt><dd>{count}</dd></div>
              <div className="cart_row"><dt>Products subtotal</dt><dd>{formatInrPaise(subtotalPaise)}</dd></div>
              <div className="cart_row is_note"><dt>Shipping</dt><dd>Confirmed on WhatsApp</dd></div>
              <div className="cart_row is_total"><dt>Total <small>(excl. shipping)</small></dt><dd className="shop_total">{formatInrPaise(subtotalPaise)}</dd></div>
            </dl>
            <p className="cart_fineprint">Shipping charges are not included in this total.</p>
            <button type="button" className="cart_cta cart_cta_wa" onClick={checkout} disabled={checking || hasIssues || (settings.ready && !settings.whatsappNumber)}>
              <BoutiqueWhatsAppIcon width={20} height={20} />{checking ? "Checking stock…" : "WhatsApp Checkout"}
            </button>
            {settings.ready && !settings.whatsappNumber && <p className="cart_wa_unavailable">WhatsApp ordering is not available right now.</p>}
            <Link href="/collections" className="cart_cta cart_cta_secondary">Continue shopping</Link>
            <ul className="cart_howto" aria-label="How ordering works">
              <li><CheckDot /><span><strong>Shipping</strong> is confirmed on WhatsApp for your PIN code.</span></li>
              <li><CheckDot /><span>Pay by <strong>Cash on Delivery</strong> or <strong>Prepaid UPI</strong>.</span></li>
              <li><CheckDot /><span><strong>Nothing is ordered</strong> until you send the message and we confirm.</span></li>
            </ul>
          </aside>
        </div>
      </Container>
    </div>
  );
}
