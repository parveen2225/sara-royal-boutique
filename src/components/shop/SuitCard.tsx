"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cartStore } from "@/lib/cartStore";
import { cartAddFeedback, type CartFeedback } from "@/lib/cartFeedback";
import ShoppingBagIcon from "./ShoppingBagIcon";
import { formatInrPaise } from "@/lib/money";
import type { PublicSuitListItem } from "@/lib/shopApi";
import "./shop.scss";

export function SuitPrice({ salePricePaise, originalPricePaise, discountPercent }: Pick<PublicSuitListItem, "salePricePaise" | "originalPricePaise" | "discountPercent">) {
  return (
    <span className="shop_price">
      <strong className="shop_price_now">{formatInrPaise(salePricePaise)}</strong>
      {discountPercent > 0 && (
        <>
          <s className="shop_price_was" aria-label={`Original price ${formatInrPaise(originalPricePaise)}`}>{formatInrPaise(originalPricePaise)}</s>
          <span className="shop_badge shop_badge_discount">{discountPercent}% off</span>
        </>
      )}
    </span>
  );
}

type Feedback = CartFeedback | null;

/** Adds one unit with the shared cart logic (merges with an existing line, never exceeds stock). */
const addOne = (suit: PublicSuitListItem): Feedback =>
  cartAddFeedback(cartStore.add({ id: suit.id, sku: suit.sku, name: suit.name, image: suit.cover, unitPricePaise: suit.salePricePaise, maxQuantity: suit.maxQuantity }, 1), suit.maxQuantity);

export default function SuitCard({ suit }: { suit: PublicSuitListItem }) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(t);
  }, [feedback]);
  const href = `/suits/${suit.id}`;
  return (
    <article className={`shop_card ${suit.inStock ? "" : "is_out"}`}>
      <Link href={href} className="shop_card_media" aria-label={suit.name}>
        {suit.cover ? (
          <Image src={suit.cover} alt={suit.name} fill sizes="(max-width: 575px) 50vw, (max-width: 991px) 33vw, 25vw" className="shop_card_img" />
        ) : (
          <span className="shop_card_noimg">No photo</span>
        )}
        {suit.discountPercent > 0 && <span className="shop_badge shop_badge_corner">{suit.discountPercent}% off</span>}
        {!suit.inStock && <span className="shop_badge shop_badge_out">Out of Stock</span>}
      </Link>
      <div className="shop_card_body">
        <h3 className="shop_card_title"><Link href={href}>{suit.name}</Link></h3>
        <p className="shop_card_meta">{suit.sku}{suit.fabric ? ` · ${suit.fabric}` : ""}</p>
        <SuitPrice {...suit} />
        <div className="shop_card_actions">
          <button type="button" className="shop_btn shop_btn_solid shop_card_btn" onClick={() => setFeedback(addOne(suit))} disabled={!suit.inStock}
            aria-label={suit.inStock ? `Add ${suit.name} to cart` : `${suit.name} is out of stock`}>
            {suit.inStock && <ShoppingBagIcon size={16} strokeWidth={1.8} />}
            {suit.inStock ? "Add to Cart" : "Out of Stock"}
          </button>
          <Link href={href} className="shop_btn shop_card_btn" aria-label={`View details of ${suit.name}`}>View Details</Link>
        </div>
        <p className={`shop_card_feedback ${feedback ? `is_${feedback.tone}` : ""}`} role="status" aria-live="polite">
          {feedback?.text}{feedback?.tone === "ok" && <> <Link href="/cart">View cart</Link></>}
        </p>
      </div>
    </article>
  );
}
