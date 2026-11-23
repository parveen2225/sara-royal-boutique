import PDFDocument from "pdfkit";
import { invoiceContent, type InvoiceSnapshot } from "@/lib/invoiceText";
import { FONT_FILES, fontPath, loadFont, toRuns, type FontKey, type Run } from "@/lib/invoiceFonts";

type Inv = { invoiceId: string; orderId: string; issuedAt: Date | string; snapshot: InvoiceSnapshot };
export type RenderOptions = {
  logo?: Buffer | null;
  cancelled?: boolean;
  compress?: boolean;
  /** Test hook: receives every line of text that is drawn (in drawing order). */
  onText?: (line: string) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = any;
const regName = (k: FontKey, bold: boolean) => `${k}${bold ? "B" : "R"}`;

/** Layout engine: mixed-script aware measuring, word wrapping (grapheme-safe) and per-run drawing. */
function makeText(doc: PDFKit.PDFDocument, onText?: (l: string) => void) {
  const d = doc as AnyDoc;
  for (const k of Object.keys(FONT_FILES) as FontKey[]) {
    doc.registerFont(regName(k, false), loadFont(FONT_FILES[k].regular));
    doc.registerFont(regName(k, true), loadFont(FONT_FILES[k].bold));
  }
  const fk: Partial<Record<FontKey, { hasGlyphForCodePoint: (cp: number) => boolean }>> = {};
  const covers = (k: FontKey, cp: number) => {
    let f = fk[k];
    if (!f) { doc.font(regName(k, false)); f = d._font.font; fk[k] = f; }
    return f!.hasGlyphForCodePoint(cp);
  };
  const width = (runs: Run[], size: number, bold: boolean) => runs.reduce((w, r) => w + doc.font(regName(r.font, bold)).fontSize(size).widthOfString(r.text), 0);
  const seg = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  const graphemes = (s: string) => (seg ? Array.from(seg.segment(s), (x) => x.segment) : Array.from(s));

  function wrap(text: string, maxWidth: number, size: number, bold: boolean): Run[][] {
    const lines: Run[][] = [];
    for (const para of text.split(/\r?\n/)) {
      let cur: Run[] = [];
      let curW = 0;
      const push = () => {
        if (cur.length) cur[cur.length - 1] = { ...cur[cur.length - 1], text: cur[cur.length - 1].text.replace(/\s+$/, "") };
        lines.push(cur);
        cur = []; curW = 0;
      };
      for (const tok of para.split(/(\s+)/).filter((t) => t !== "")) {
        const runs = toRuns(tok, covers);
        const w = width(runs, size, bold);
        if (/^\s+$/.test(tok)) { if (cur.length) { cur.push(...runs); curW += w; } continue; }
        if (curW + w <= maxWidth) { cur.push(...runs); curW += w; continue; }
        if (cur.length && w <= maxWidth) { push(); cur.push(...runs); curW = w; continue; }
        if (cur.length) push();
        for (const g of graphemes(tok)) { // a single token wider than the line: break between characters, never inside one
          const gr = toRuns(g, covers);
          const gw = width(gr, size, bold);
          if (curW + gw > maxWidth && cur.length) push();
          cur.push(...gr); curW += gw;
        }
      }
      push();
    }
    return lines;
  }

  /** Draw wrapped text; returns the y below it. */
  function text(value: string, x: number, y: number, o: { width: number; size?: number; bold?: boolean; color?: string; align?: "left" | "right" | "center"; gap?: number }): number {
    const size = o.size ?? 10, bold = o.bold ?? false, lh = size * 1.4 + (o.gap ?? 0);
    doc.fillColor(o.color ?? "#000");
    for (const line of wrap(value, o.width, size, bold)) {
      const lw = width(line, size, bold);
      let cx = o.align === "right" ? x + o.width - lw : o.align === "center" ? x + (o.width - lw) / 2 : x;
      for (const r of line) {
        doc.font(regName(r.font, bold)).fontSize(size).text(r.text, cx, y, { lineBreak: false });
        cx += doc.widthOfString(r.text);
      }
      onText?.(line.map((r) => r.text).join(""));
      y += lh;
    }
    return y;
  }
  const height = (value: string, maxWidth: number, size: number, bold = false) => wrap(value, maxWidth, size, bold).length * (size * 1.4);
  return { text, height };
}

/** Lay the invoice out on A4. `logo` is PNG/JPEG bytes frozen at issue time; `cancelled` adds a banner (not part of the snapshot). */
export function renderInvoicePdf(inv: Inv, opts: RenderOptions = {}): Promise<Buffer> {
  const c = invoiceContent(inv);
  // The default font is an embedded one, so pdfkit never needs its built-in Helvetica data files.
  const doc = new PDFDocument({ size: "A4", margin: 40, compress: opts.compress !== false, font: fontPath(FONT_FILES.latin.regular), info: { Title: `Invoice ${c.invoiceNumber}`, Author: c.businessLines[0] ?? "" } });
  const chunks: Buffer[] = [];
  doc.on("data", (d: Buffer) => chunks.push(d));
  const done = new Promise<Buffer>((resolve, reject) => { doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  const T = makeText(doc, opts.onText);

  const L = 40, R = 555, W = R - L;
  const topY = 40;
  if (opts.logo) { try { doc.image(opts.logo, L, topY, { fit: [110, 60] }); } catch { /* unreadable logo: skip it rather than fail the invoice */ } }
  const hx = L + 130, hw = W - 130;
  let y = T.text(c.businessLines[0] ?? "", hx, topY, { width: hw, size: 15, bold: true, align: "right" });
  if (c.businessLines.length > 1) y = T.text(c.businessLines.slice(1).join("\n"), hx, y + 2, { width: hw, size: 9, align: "right" });
  if (c.gstLine) y = T.text(c.gstLine, hx, y + 2, { width: hw, size: 9, align: "right" });
  y = Math.max(y, topY + 64) + 8;

  doc.moveTo(L, y).lineTo(R, y).strokeColor("#c9a84c").lineWidth(1.2).stroke();
  y += 10;
  T.text(c.title, L, y, { width: W, size: 18, bold: true });
  if (opts.cancelled) T.text("ORDER CANCELLED", L, y + 3, { width: W, size: 11, bold: true, color: "#b91c1c", align: "right" });
  y += 30;
  T.text(`Invoice no: ${c.invoiceNumber}`, L, y, { width: W / 2 });
  T.text(`Invoice date: ${c.invoiceDate}`, L + W / 2, y, { width: W / 2, align: "right" });
  y += 15;
  T.text(`Order no: ${c.orderNumber}${c.orderDate ? ` (${c.orderDate})` : ""}`, L, y, { width: W });
  y += 26;
  T.text("Bill to", L, y, { width: 300, bold: true });
  y = T.text(c.billTo.join("\n"), L, y + 15, { width: 300 }) + 14;

  const colX = { n: L, d: L + 28, q: L + 300, u: L + 345, t: L + 435 };
  const header = () => {
    doc.rect(L, y - 4, W, 20).fill("#f3ead7");
    T.text("#", colX.n + 4, y, { width: 20, size: 9.5, bold: true });
    T.text("Item", colX.d, y, { width: 260, size: 9.5, bold: true });
    T.text("Qty", colX.q, y, { width: 38, size: 9.5, bold: true, align: "right" });
    T.text("Unit price", colX.u, y, { width: 85, size: 9.5, bold: true, align: "right" });
    T.text("Total", colX.t, y, { width: R - colX.t - 4, size: 9.5, bold: true, align: "right" });
    y += 22;
  };
  header();
  for (const r of c.rows) {
    const h = Math.max(16, T.height(r.description, 255, 9.5) + 6);
    if (y + h > 740) { doc.addPage(); y = 50; header(); }
    T.text(String(r.n), colX.n + 4, y, { width: 20, size: 9.5 });
    T.text(r.description, colX.d, y, { width: 255, size: 9.5 });
    T.text(String(r.quantity), colX.q, y, { width: 38, size: 9.5, align: "right" });
    T.text(r.unit, colX.u, y, { width: 85, size: 9.5, align: "right" });
    T.text(r.total, colX.t, y, { width: R - colX.t - 4, size: 9.5, align: "right" });
    y += h;
    doc.moveTo(L, y - 2).lineTo(R, y - 2).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
  }
  y += 10;
  if (y > 690) { doc.addPage(); y = 50; }
  for (const [label, value] of c.totals) {
    const strong = label === "Invoice total", size = strong ? 11.5 : 10;
    T.text(label, colX.u - 90, y, { width: 170, size, bold: strong, align: "right" });
    T.text(value, colX.t, y, { width: R - colX.t - 4, size, bold: strong, align: "right" });
    y += strong ? 21 : 16;
  }
  y += 8;
  T.text(c.payment, L, y, { width: W });
  if (c.footer) T.text(c.footer, L, Math.max(y + 36, 760), { width: W, size: 9, color: "#555", align: "center" });
  doc.end();
  return done;
}
