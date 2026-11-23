import Invoice from "@/models/Invoice";
import SuitOrder from "@/models/SuitOrder";
import { nextSequence } from "@/lib/counters";
import { istYear } from "@/lib/dates";
import { getSettingsDoc } from "@/lib/settings";
import { isCloudinaryImageUrl } from "@/lib/cloudinaryUrl";
import { DEFAULT_BOUTIQUE_NAME } from "@/lib/suitWhatsapp";
import type { AuthUser } from "@/lib/auth/permissions";

export class InvoiceError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any;
export const formatInvoiceId = (year: number, seq: number) => `SRI-${year}-${String(seq).padStart(4, "0")}`;

const MAX_LOGO_BYTES = 1_500_000;
const looksLikeImage = (b: Buffer) => (b[0] === 0x89 && b[1] === 0x50) || (b[0] === 0xff && b[1] === 0xd8);

/** Download the logo once (as PNG, max 400px wide) so the invoice keeps its original branding forever. */
export async function fetchLogoBytes(url: string, fetchImpl: typeof fetch = fetch): Promise<Buffer> {
  if (!isCloudinaryImageUrl(url)) throw new InvoiceError(503, "The invoice logo is not a valid uploaded image.");
  const transformed = url.replace("/image/upload/", "/image/upload/f_png,w_400,c_limit/");
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 7000);
  try {
    const res = await fetchImpl(transformed, { signal: ctl.signal });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_LOGO_BYTES || !looksLikeImage(buf)) throw new Error("not a usable image");
    return buf;
  } catch {
    throw new InvoiceError(503, "Could not load the invoice logo. Try again in a moment, or remove the logo in Settings.");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Issue the order's invoice (once) or return the existing one. The business details, GST settings, customer, items and
 * logo are copied into the invoice at this moment; re-downloads use that copy, never the current settings.
 */
export async function getOrIssueInvoice(orderRef: string, actor: Pick<AuthUser, "id" | "email">, opts: { fetchImpl?: typeof fetch } = {}): Promise<Doc> {
  const existing = await Invoice.findOne({ orderRef }).select("+logo").lean<Doc>();
  if (existing) return existing;
  const order = await SuitOrder.findById(orderRef).lean<Doc>();
  if (!order) throw new InvoiceError(404, "Order not found");
  if (order.status === "cancelled") throw new InvoiceError(409, "A cancelled order cannot be invoiced.");

  const s: Doc = await getSettingsDoc();
  const logo = s.logo?.url ? await fetchLogoBytes(s.logo.url, opts.fetchImpl) : null;
  const year = istYear();
  const invoiceId = formatInvoiceId(year, await nextSequence(`suit-invoice-${year}`));
  try {
    await Invoice.create({
      invoiceId, orderRef: order._id, orderId: order.orderId, issuedAt: new Date(), issuedById: actor.id, issuedByEmail: actor.email,
      snapshot: {
        business: { name: s.boutiqueName || DEFAULT_BOUTIQUE_NAME, address: s.businessAddress ?? "", contactNumber: s.contactNumber ?? "", email: s.email ?? "", footer: s.invoiceFooter ?? "" },
        gst: { enabled: Boolean(s.gst?.enabled), gstin: s.gst?.gstin ?? "", legalName: s.gst?.legalName ?? "" },
        customer: order.customer,
        items: order.items.map((i: Doc) => ({ sku: i.sku, name: i.name, quantity: i.quantity, unitPricePaise: i.unitPricePaise, lineTotalPaise: i.lineTotalPaise })),
        subtotalPaise: order.subtotalPaise, deliveryChargePaise: order.deliveryChargePaise, totalPaise: order.totalPaise, paymentMethod: order.paymentMethod, orderDate: order.createdAt,
      },
      logo, logoType: logo ? "image/png" : "",
    });
  } catch (error) {
    if ((error as { code?: number })?.code !== 11000) throw error; // a concurrent request issued it first
  }
  // Whoever won the race, point the order at the invoice that actually exists (a losing request's number is never used).
  const issued = await Invoice.findOne({ orderRef }).select("+logo").lean<Doc>();
  await SuitOrder.updateOne({ _id: orderRef, invoiceId: { $ne: issued.invoiceId } }, { $set: { invoiceId: issued.invoiceId } });
  return issued;
}
