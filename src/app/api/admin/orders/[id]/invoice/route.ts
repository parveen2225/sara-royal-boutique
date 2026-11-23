import type { NextRequest } from "next/server";
import SuitOrder from "@/models/SuitOrder";
import { jsonError } from "@/lib/api/utils";
import { requirePermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { isObjectId } from "@/lib/validation";
import { getOrIssueInvoice, InvoiceError } from "@/lib/invoiceService";
import { renderInvoicePdf } from "@/lib/invoicePdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only PDF. The first request issues the invoice (frozen copy of business details, GST settings, customer, items,
// prices and logo); every later request re-renders that frozen copy, so settings changes never rewrite old invoices.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "orders");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Order not found", 404);
  try {
    const inv = await getOrIssueInvoice(id, auth.user);
    const order = await SuitOrder.findById(id).select("status").lean();
    const pdf = await renderInvoicePdf({ invoiceId: inv.invoiceId, orderId: inv.orderId, issuedAt: inv.issuedAt, snapshot: inv.snapshot }, { logo: inv.logo?.length ? Buffer.from(inv.logo.buffer ?? inv.logo) : null, cancelled: order?.status === "cancelled" });
    await logAudit(auth.user, "invoice.downloaded", { type: "invoice", id: String(inv._id) }, inv.invoiceId);
    const inline = req.nextUrl.searchParams.get("inline") === "1";
    return new Response(new Uint8Array(pdf), { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${inv.invoiceId}.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if (error instanceof InvoiceError) return jsonError(error.message, error.status);
    console.error("[API /admin/orders/:id/invoice]", error instanceof Error ? error.message : error);
    return jsonError("Could not generate the invoice", 500);
  }
}
