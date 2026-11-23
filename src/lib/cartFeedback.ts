import type { AddResult } from "./cartCore";

export type CartFeedback = { tone: "ok" | "warn"; text: string };

/** Customer-facing message for the result of adding a suit to the cart (product cards). */
export function cartAddFeedback(r: Pick<AddResult, "added" | "capped" | "error">, maxQuantity: number): CartFeedback {
  if (r.error === "out_of_stock") return { tone: "warn", text: "Sorry, this suit is out of stock." };
  if (r.error === "cart_full") return { tone: "warn", text: "Your cart is full. Remove an item first." };
  if (r.added === 0) return { tone: "warn", text: `All ${maxQuantity} available are already in your cart.` };
  return { tone: "ok", text: r.capped ? `Added. That is all we have in stock (${maxQuantity}).` : "Added to your cart." };
}
