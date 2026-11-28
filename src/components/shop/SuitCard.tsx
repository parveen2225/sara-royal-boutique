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

/**
 * `gallery` (Collections only): up to 4 photo thumbnails over the bottom of the card photo; clicking one swaps the photo in
 * place. They are buttons NEXT TO the photo link (not inside it), so they never navigate. Without it the card is unchanged.
 */
export default function SuitCard({ suit, gallery = false }: { suit: PublicSuitListItem; gallery?: boolean }) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const photos = gallery ? (suit.images ?? []).filter(Boolean) : [];
  const withThumbs = photos.length > 1;
  const [shown, setShown] = useState(0);
  const mainPhoto = withThumbs ? photos[shown] ?? suit.cover : suit.cover;
  const morePhotos = Math.max(0, (suit.imageCount ?? photos.length) - photos.length);
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(t);
  }, [feedback]);
  const href = `/suits/${suit.id}`;
  const variantCount = suit.variantCount ?? 0;
  const media = (
    <Link href={href} className="shop_card_media" aria-label={suit.name}>
      {mainPhoto ? (
        <Image src={mainPhoto} alt={withThumbs ? `${suit.name}, photo ${shown + 1}` : suit.name} fill sizes="(max-width: 575px) 50vw, (max-width: 991px) 33vw, 25vw" className="shop_card_img" />
      ) : (
        <span className="shop_card_noimg">No photo</span>
      )}
      {suit.discountPercent > 0 && <span className="shop_badge shop_badge_corner">{suit.discountPercent}% off</span>}
      {!suit.inStock && <span className="shop_badge shop_badge_out">Out of Stock</span>}
    </Link>
  );
  return (
    <article className={`shop_card ${suit.inStock ? "" : "is_out"}`}>
      {withThumbs ? (
        <div className="shop_card_visual">
          {media}
          <div className="shop_card_thumbs" role="group" aria-label={`Photos of ${suit.name}`}>
            {photos.map((src, i) => (
              <button key={src} type="button" className={`shop_card_thumb ${i === shown ? "is_on" : ""}`} aria-pressed={i === shown}
                aria-label={`Show photo ${i + 1} of ${suit.imageCount ?? photos.length}`} onClick={() => setShown(i)}>
                <Image src={src} alt="" fill sizes="44px" className="shop_card_thumb_img" />
                {i === photos.length - 1 && morePhotos > 0 && <span className="shop_card_thumb_more" aria-hidden="true">+{morePhotos}</span>}
              </button>
            ))}
          </div>
        </div>
      ) : media}
      <div className="shop_card_body">
        <h3 className="shop_card_title"><Link href={href}>{suit.name}</Link></h3>
        <p className="shop_card_meta">{suit.sku}{suit.fabric ? ` · ${suit.fabric}` : ""}{variantCount > 0 ? ` · ${variantCount} designs` : ""}</p>
        <SuitPrice {...suit} />
        <div className="shop_card_actions">
          {variantCount > 0 && suit.inStock ? (
            // Each design has its own stock, so the customer picks one on the suit page first.
            <Link href={href} className="shop_btn shop_btn_solid shop_card_btn" aria-label={`Choose a design of ${suit.name}`}>
              <ShoppingBagIcon size={16} strokeWidth={1.8} />Choose Design
            </Link>
          ) : (
            <button type="button" className="shop_btn shop_btn_solid shop_card_btn" onClick={() => setFeedback(addOne(suit))} disabled={!suit.inStock}
              aria-label={suit.inStock ? `Add ${suit.name} to cart` : `${suit.name} is out of stock`}>
              {suit.inStock && <ShoppingBagIcon size={16} strokeWidth={1.8} />}
              {suit.inStock ? "Add to Cart" : "Out of Stock"}
            </button>
          )}
          <Link href={href} className="shop_btn shop_card_btn" aria-label={`View details of ${suit.name}`}>View Details</Link>
        </div>
        <p className={`shop_card_feedback ${feedback ? `is_${feedback.tone}` : ""}`} role="status" aria-live="polite">
          {feedback?.text}{feedback?.tone === "ok" && <> <Link href="/cart">View cart</Link></>}
        </p>
      </div>
    </article>
  );
}
