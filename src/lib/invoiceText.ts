// Pure: everything the invoice shows, as plain text lines. The PDF renderer only lays these out, so tests can verify
// the content without parsing PDF bytes.
import { formatInrPaise } from "./money";
import { ymdIst } from "./dates";

export type InvoiceSnapshot = {
  business: { name?: string; address?: string; contactNumber?: string; email?: string; footer?: string };
  gst: { enabled?: boolean; gstin?: string; legalName?: string };
  customer: { name: string; phone: string; address: string; pincode: string };
  items: { sku: string; name: string; quantity: number; unitPricePaise: number; lineTotalPaise: number }[];
  subtotalPaise: number;
  deliveryChargePaise: number;
  totalPaise: number;
  paymentMethod: string;
  orderDate?: Date | string;
};

/** Strip control characters and normalise; Unicode (Hindi, Punjabi, ...) is kept: the PDF embeds fonts for it. */
export const clean = (s: unknown) => String(s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").normalize("NFC");
export const rs = (paise: number) => formatInrPaise(paise); // "₹1,499.50" (the embedded Noto Sans has the rupee sign)
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtDate = (d: Date | string) => { const [y, m, day] = ymdIst(new Date(d)).split("-").map(Number); return `${String(day).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`; };

export function invoiceContent(inv: { invoiceId: string; orderId: string; issuedAt: Date | string; snapshot: InvoiceSnapshot }) {
  const s = inv.snapshot;
  const b = s.business;
  const businessLines = [b.name, b.address, b.contactNumber && `Phone: ${b.contactNumber}`, b.email && `Email: ${b.email}`].filter(Boolean).map(clean);
  const gstLine = s.gst?.enabled && s.gst.gstin ? `GSTIN: ${s.gst.gstin}${s.gst.legalName ? ` (${s.gst.legalName})` : ""}` : "";
  return {
    title: "INVOICE", // never "TAX INVOICE": no tax treatment is assumed
    invoiceNumber: inv.invoiceId,
    invoiceDate: fmtDate(inv.issuedAt),
    orderNumber: inv.orderId,
    orderDate: s.orderDate ? fmtDate(s.orderDate) : "",
    businessLines,
    gstLine: clean(gstLine), // only when GST is enabled AND a GSTIN is configured; no GST amounts are ever added
    billTo: [s.customer.name, s.customer.address, `PIN: ${s.customer.pincode}`, `Phone: +${s.customer.phone}`].map(clean),
    rows: s.items.map((i, n) => ({ n: n + 1, description: clean(`${i.name} (${i.sku})`), quantity: i.quantity, unit: rs(i.unitPricePaise), total: rs(i.lineTotalPaise) })),
    totals: [["Products subtotal", rs(s.subtotalPaise)], ["Delivery charges", rs(s.deliveryChargePaise)], ["Invoice total", rs(s.totalPaise)]] as [string, string][],
    payment: `Payment method: ${s.paymentMethod === "upi" ? "Prepaid UPI" : "Cash on Delivery"}`,
    footer: clean(b.footer ?? ""),
  };
}
