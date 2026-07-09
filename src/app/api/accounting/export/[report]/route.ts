import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Bookkeeper exports.
 * - invoices: QuickBooks Online invoice-import CSV (one row per line item)
 * - payments: payments-received report
 * - purchase-orders: committed-cost report (one row per PO line)
 * ?from=YYYY-MM-DD&to=YYYY-MM-DD filter (inclusive).
 */

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

const mdy = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
};

export async function GET(request: Request, props: { params: Promise<{ report: string }> }) {
  const { report } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const from = url.searchParams.get("from") || "2000-01-01";
  const to = url.searchParams.get("to") || "2999-12-31";
  const fromTs = `${from}T00:00:00Z`;
  const toTs = `${to}T23:59:59Z`;

  let body: string;
  let filename: string;

  if (report === "invoices") {
    const { data: invoices } = await supabase
      .from("invoices")
      .select(
        "id, invoice_number, title, status, total, due_date, sent_at, created_at, project:projects(title), client:profiles!invoices_client_id_fkey(first_name, last_name, email, organization_name)"
      )
      .neq("status", "draft")
      .neq("status", "void")
      .gte("created_at", fromTs)
      .lte("created_at", toTs)
      .order("created_at", { ascending: true });

    const ids = (invoices ?? []).map((i) => i.id);
    const { data: allLines } = ids.length
      ? await supabase
          .from("invoice_line_items")
          .select("invoice_id, description, quantity, unit_amount, amount, display_order")
          .in("invoice_id", ids)
          .order("display_order")
      : { data: [] };

    const rows: unknown[][] = [
      [
        "*InvoiceNo",
        "*Customer",
        "*InvoiceDate",
        "*DueDate",
        "ItemDescription",
        "ItemQuantity",
        "ItemRate",
        "*ItemAmount",
        "Memo",
      ],
    ];
    for (const inv of invoices ?? []) {
      const project = Array.isArray(inv.project) ? inv.project[0] : inv.project;
      const client = Array.isArray(inv.client) ? inv.client[0] : inv.client;
      const customer =
        client?.organization_name ||
        [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
        client?.email ||
        project?.title ||
        "Customer";
      const invoiceDate = mdy(inv.sent_at ?? inv.created_at);
      const dueDate = mdy(inv.due_date) || invoiceDate;
      const lines = (allLines ?? []).filter((l) => l.invoice_id === inv.id);
      const effective = lines.length
        ? lines
        : [{ description: inv.title, quantity: 1, unit_amount: inv.total, amount: inv.total }];
      for (const line of effective) {
        rows.push([
          inv.invoice_number,
          customer,
          invoiceDate,
          dueDate,
          line.description,
          Number(line.quantity),
          Number(line.unit_amount).toFixed(2),
          Number(line.amount).toFixed(2),
          project?.title ? `Job: ${project.title}` : "",
        ]);
      }
    }
    body = csv(rows);
    filename = `quickbooks-invoices-${from}-to-${to}.csv`;
  } else if (report === "payments") {
    const { data: invoices } = await supabase
      .from("invoices")
      .select(
        "invoice_number, title, status, total, amount_paid, paid_at, mercury_status, mercury_pay_slug, project:projects(title), client:profiles!invoices_client_id_fkey(first_name, last_name, email, organization_name)"
      )
      .gt("amount_paid", 0)
      .gte("paid_at", fromTs)
      .lte("paid_at", toTs)
      .order("paid_at", { ascending: true });

    const rows: unknown[][] = [["Date", "Customer", "InvoiceNo", "Amount", "Method", "Job"]];
    for (const inv of invoices ?? []) {
      const project = Array.isArray(inv.project) ? inv.project[0] : inv.project;
      const client = Array.isArray(inv.client) ? inv.client[0] : inv.client;
      const customer =
        client?.organization_name ||
        [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
        client?.email ||
        "Customer";
      rows.push([
        mdy(inv.paid_at),
        customer,
        inv.invoice_number,
        Number(inv.amount_paid).toFixed(2),
        inv.mercury_pay_slug && inv.mercury_status === "paid" ? "Mercury ACH" : "Card / other",
        project?.title ?? "",
      ]);
    }
    body = csv(rows);
    filename = `payments-received-${from}-to-${to}.csv`;
  } else if (report === "purchase-orders") {
    const { data: pos } = await supabase
      .from("purchase_orders")
      .select(
        "id, po_number, title, status, total, issue_date, needed_by, created_at, project:projects(title), subcontractor:subcontractors(company_name)"
      )
      .neq("status", "cancelled")
      .gte("created_at", fromTs)
      .lte("created_at", toTs)
      .order("created_at", { ascending: true });

    const ids = (pos ?? []).map((p) => p.id);
    const { data: allLines } = ids.length
      ? await supabase
          .from("purchase_order_lines")
          .select("purchase_order_id, description, quantity, unit_amount, amount, cost_division")
          .in("purchase_order_id", ids)
          .order("display_order")
      : { data: [] };

    const rows: unknown[][] = [
      ["PONumber", "Vendor", "Job", "Status", "IssueDate", "LineDescription", "Qty", "Rate", "Amount", "CostDivision"],
    ];
    for (const po of pos ?? []) {
      const project = Array.isArray(po.project) ? po.project[0] : po.project;
      const sub = Array.isArray(po.subcontractor) ? po.subcontractor[0] : po.subcontractor;
      const lines = (allLines ?? []).filter((l) => l.purchase_order_id === po.id);
      for (const line of lines) {
        rows.push([
          po.po_number,
          sub?.company_name ?? "",
          project?.title ?? "",
          po.status,
          mdy(po.issue_date),
          line.description,
          Number(line.quantity),
          Number(line.unit_amount).toFixed(2),
          Number(line.amount).toFixed(2),
          line.cost_division ?? "",
        ]);
      }
    }
    body = csv(rows);
    filename = `committed-costs-${from}-to-${to}.csv`;
  } else {
    return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
