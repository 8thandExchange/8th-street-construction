import ExcelJS from "exceljs";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The Budget-vs-Actuals workbook the city requires with each Habitat
 * invoice — same shape as the office's old spreadsheet: one row per City #,
 * one column per invoice (labeled YYMMDD like the city's sheet), then
 * TOTALS and B vs A. Built fresh from live data every time.
 */

const NAVY = "FF101C2A";
const PAPER = "FFF7F5F0";

function invoiceColumnLabel(inv: { invoice_number: string; sent_at: string | null; created_at: string }) {
  const d = new Date(inv.sent_at ?? inv.created_at);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}\n${inv.invoice_number}`;
}

export async function buildCityBudgetWorkbook(
  projectId: string
): Promise<{ buffer: Buffer; fileName: string } | null> {
  const admin = createAdminClient();

  const [{ data: project }, { data: budgetLines }, { data: invoices }] = await Promise.all([
    admin.from("projects").select("title, slug").eq("id", projectId).single(),
    admin
      .from("city_budget_lines")
      .select("id, city_number, description, budget_amount")
      .eq("project_id", projectId)
      .order("city_number"),
    // Drafts stay in — the Excel is previewed before the draft is sent, and
    // by the time it rides the client email the invoice is already 'sent'.
    admin
      .from("invoices")
      .select("id, invoice_number, status, sent_at, created_at")
      .eq("project_id", projectId)
      .neq("status", "void")
      .order("sent_at", { ascending: true, nullsFirst: false }),
  ]);
  if (!budgetLines?.length) return null;

  const invoiceList = invoices ?? [];
  const { data: items } = invoiceList.length
    ? await admin
        .from("invoice_line_items")
        .select("invoice_id, city_budget_line_id, amount")
        .in("invoice_id", invoiceList.map((i) => i.id))
        .not("city_budget_line_id", "is", null)
    : { data: [] };

  // amounts[budgetLineId][invoiceId] = billed amount
  const amounts = new Map<string, Map<string, number>>();
  for (const row of items ?? []) {
    if (!row.city_budget_line_id) continue;
    const byInvoice = amounts.get(row.city_budget_line_id) ?? new Map<string, number>();
    byInvoice.set(row.invoice_id, (byInvoice.get(row.invoice_id) ?? 0) + Number(row.amount));
    amounts.set(row.city_budget_line_id, byInvoice);
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "8th Street Construction";
  const ws = wb.addWorksheet("Invoices", { views: [{ state: "frozen", xSplit: 2, ySplit: 1 }] });

  const header = [
    "City #",
    "Description",
    "Budget",
    ...invoiceList.map(invoiceColumnLabel),
    "TOTALS",
    "B vs A",
  ];
  ws.addRow(header);

  const money = "#,##0.00";
  for (const line of budgetLines) {
    const byInvoice = amounts.get(line.id);
    const perInvoice = invoiceList.map((inv) => byInvoice?.get(inv.id) ?? null);
    const total = perInvoice.reduce((s: number, v) => s + (v ?? 0), 0);
    ws.addRow([
      line.city_number,
      line.description,
      Number(line.budget_amount),
      ...perInvoice.map((v) => (v == null ? null : Math.round(v * 100) / 100)),
      Math.round(total * 100) / 100,
      Math.round((total - Number(line.budget_amount)) * 100) / 100,
    ]);
  }

  const lastDataRow = ws.rowCount;
  const totalRow = ws.addRow([
    "Total",
    "",
    ...Array.from({ length: header.length - 2 }, (_, c) => {
      const col = ws.getColumn(c + 3).letter;
      return { formula: `SUM(${col}2:${col}${lastDataRow})` };
    }),
  ]);

  // Styling — clean, bank-statement plain
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { wrapText: true, vertical: "middle" };
  });
  ws.getRow(1).height = 30;
  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PAPER } };
  });
  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 38;
  for (let c = 3; c <= header.length; c++) {
    ws.getColumn(c).width = 14;
    ws.getColumn(c).numFmt = money;
  }

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  const slugPart = (project?.slug ?? "project").replace(/[^a-z0-9-]/gi, "");
  return {
    buffer,
    fileName: `${slugPart}-city-budget-vs-actuals.xlsx`,
  };
}
