import ExcelJS from "exceljs";
import { safeText, toCsv } from "@/lib/csv";
import type { Report } from "@/lib/reports";

export const reportToCsv = (r: Report) => toCsv(r.columns.map((c) => c.header), r.rows);

/** .xlsx with real number cells for money (2-decimal format). Text cells are formula-injection safe. */
export async function reportToXlsx(r: Report, meta: { rangeLabel: string; definitions?: string[] }): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sara Royal Boutique";
  const fill = (ws: ExcelJS.Worksheet, columns: Report["columns"], rows: Report["rows"]) => {
    ws.columns = columns.map((c) => ({ header: c.header, key: c.header, width: c.width ?? 16 }));
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    for (const row of rows) ws.addRow(row.map((v, i) => (typeof v === "string" && !columns[i].money ? safeText(v) : v instanceof Date ? v.toISOString() : v)));
    columns.forEach((c, i) => { if (c.money) ws.getColumn(i + 1).numFmt = "#,##0.00"; });
  };
  const ws = wb.addWorksheet(r.title);
  fill(ws, r.columns, r.rows);
  if (r.summary) fill(wb.addWorksheet(r.summary.title), r.summary.columns, r.summary.rows);
  const info = wb.addWorksheet("About");
  info.addRow(["Report", r.title]);
  info.addRow(["Date range (IST)", meta.rangeLabel]);
  info.addRow(["Generated", new Date().toISOString()]);
  for (const d of meta.definitions ?? []) info.addRow(["", d]);
  info.getColumn(1).width = 20; info.getColumn(2).width = 110;
  return Buffer.from(await wb.xlsx.writeBuffer());
}
