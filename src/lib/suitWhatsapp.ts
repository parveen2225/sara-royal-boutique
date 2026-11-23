// Pure WhatsApp message builders (website + mobile use the same wording). Opening WhatsApp only prefills text:
// it never creates an order, never deducts stock and never clears the cart.
import { formatInrPaise } from "./money";

/** `url`: the public product page (https). WhatsApp may show a preview card for the first link in the message. */
export type WaLine = { name: string; sku: string; quantity: number; unitPricePaise: number; url?: string };

const safeLink = (url?: string) => {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !u.username && !u.password ? u.toString() : null;
  } catch {
    return null;
  }
};

export const DEFAULT_BOUTIQUE_NAME = "Sara Royal Boutique";

export function buildOrderMessage(lines: WaLine[], boutiqueName = DEFAULT_BOUTIQUE_NAME): string {
  const total = lines.reduce((s, l) => s + l.unitPricePaise * l.quantity, 0);
  const body = lines.map((l, i) =>
    [
      `${i + 1}. ${l.name}`,
      `   SKU: ${l.sku}`,
      `   Quantity: ${l.quantity}`,
      `   Price: ${formatInrPaise(l.unitPricePaise)} each`,
      `   Subtotal: ${formatInrPaise(l.unitPricePaise * l.quantity)}`,
      ...(safeLink(l.url) ? [`   Product link: ${safeLink(l.url)}`] : []),
    ].join("\n"),
  );
  return [
    `Hello ${boutiqueName},`,
    "",
    lines.length === 1 ? "I would like to order this unstitched suit:" : "I would like to order these unstitched suits:",
    "",
    body.join("\n\n"),
    "",
    `Products total: ${formatInrPaise(total)}`,
    "",
    "Please confirm:",
    "• availability of these items",
    "• the shipping charges for my PIN code (not included in the total above)",
    "",
    "Payment options: Cash on Delivery or Prepaid UPI.",
    "I will share my name, full delivery address and PIN code here in the chat.",
  ].join("\n");
}

/** wa.me link; `number` is digits with country code (as stored by the admin settings). */
export function buildWhatsAppUrl(number: string, text: string): string | null {
  if (!/^\d{11,15}$/.test(number)) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export type StatusMessageInput = {
  orderId: string;
  status: "confirmed" | "packed" | "shipped" | "delivered";
  customerName?: string;
  courierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  boutiqueName?: string;
};

/** Admin → customer status update text (admin presses Send manually; no paid API). */
export function buildStatusMessage(i: StatusMessageInput): string {
  const name = i.customerName?.trim();
  const brand = i.boutiqueName?.trim() || DEFAULT_BOUTIQUE_NAME;
  const head = `Hello${name ? ` ${name}` : ""}, this is ${brand}.`;
  const lines: string[] = [head, ""];
  switch (i.status) {
    case "confirmed": lines.push(`Your order ${i.orderId} is confirmed. Thank you for shopping with us!`); break;
    case "packed": lines.push(`Your order ${i.orderId} has been packed and will be shipped soon.`); break;
    case "shipped":
      lines.push(`Good news! Your order ${i.orderId} has been shipped.`);
      if (i.courierName) lines.push(`Courier: ${i.courierName}`);
      if (i.trackingNumber) lines.push(`Tracking number: ${i.trackingNumber}`);
      if (i.trackingUrl) lines.push(`Track your parcel: ${i.trackingUrl}`);
      break;
    case "delivered": lines.push(`Your order ${i.orderId} has been delivered. We hope you love it! If anything is not right, please message us within 3 days of delivery.`); break;
  }
  return lines.join("\n");
}
