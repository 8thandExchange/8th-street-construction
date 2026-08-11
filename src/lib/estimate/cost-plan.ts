/**
 * Loading and recomputing a project's cost plan.
 *
 * `estimated_amount` on a formula-driven line is a cache of the evaluated
 * result — the company dashboard, CostComparisonPanel and the bid pages all
 * read it directly and know nothing about formulas. Every mutation therefore
 * recomputes the plan and writes the cache back, so those consumers can never
 * see a stale number.
 */

import { computeCostPlan, type CostLineInput, type TakeoffInput, type CostPlanTotals } from "./formula";

export type CostPlanLine = {
  id: string;
  code: string | null;
  trade_label: string;
  section: string | null;
  line_type: "cost" | "markup" | "contingency";
  unit: string | null;
  formula: string | null;
  estimated_amount: number | null;
  awarded_amount: number | null;
  notes: string | null;
  is_allowance: boolean;
  display_order: number;
};

export type TakeoffValue = {
  id: string;
  key: string;
  label: string;
  unit: string | null;
  value: number | null;
  formula: string | null;
  section: string;
  display_order: number;
};

/** Derived spend per line, straight from project_cost_line_rollup. */
export type LineRollup = {
  committed: number;
  actual: number;
  billed: number;
  remaining: number;
  po_count: number;
  bill_count: number;
  invoice_count: number;
};

/** The individual records behind a line's committed / actual / billed. */
export type LineAttribution = {
  kind: "po" | "bill" | "invoice";
  id: string;
  label: string;
  reference: string | null;
  status: string | null;
  amount: number;
};

export type CostPlan = {
  lines: CostPlanLine[];
  takeoff: TakeoffValue[];
  totals: CostPlanTotals;
  rollup: Record<string, LineRollup>;
  attribution: Record<string, LineAttribution[]>;
  /** Money on this job not yet coded to any line — the work queue. */
  uncoded: {
    bills: { id: string; vendorName: string; billNumber: string | null; title: string; amount: number; allocated: number }[];
    invoiceLines: { id: string; invoiceNumber: string; description: string; amount: number }[];
  };
};

export const EMPTY_ROLLUP: LineRollup = {
  committed: 0,
  actual: 0,
  billed: 0,
  remaining: 0,
  po_count: 0,
  bill_count: 0,
  invoice_count: 0,
};

const LINE_COLUMNS =
  "id, code, trade_label, section, line_type, unit, formula, estimated_amount, awarded_amount, notes, is_allowance, display_order";
const TAKEOFF_COLUMNS = "id, key, label, unit, value, formula, section, display_order";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

function toLineInputs(lines: CostPlanLine[]): CostLineInput[] {
  return lines.map((l) => ({
    id: l.id,
    code: l.code,
    line_type: l.line_type,
    formula: l.formula,
    estimated_amount: l.estimated_amount == null ? null : Number(l.estimated_amount),
  }));
}

function toTakeoffInputs(takeoff: TakeoffValue[]): TakeoffInput[] {
  return takeoff.map((t) => ({
    key: t.key,
    value: t.value == null ? null : Number(t.value),
    formula: t.formula,
  }));
}

export async function loadCostPlan(
  supabase: Db,
  projectId: string,
  project?: { square_footage?: number | null; heated_square_footage?: number | null }
): Promise<CostPlan> {
  const [
    { data: lineRows },
    { data: takeoffRows },
    { data: rollupRows },
    { data: poRows },
    { data: billRows },
    { data: invoiceRows },
  ] = await Promise.all([
    supabase.from("project_estimate_lines").select(LINE_COLUMNS).eq("project_id", projectId).order("display_order"),
    supabase.from("project_takeoff_values").select(TAKEOFF_COLUMNS).eq("project_id", projectId).order("display_order"),
    supabase
      .from("project_cost_line_rollup")
      .select("id, committed, actual, billed, remaining, po_count, bill_count, invoice_count")
      .eq("project_id", projectId),
    supabase
      .from("purchase_order_lines")
      .select("id, amount, description, estimate_line_id, purchase_orders!inner(id, po_number, status, project_id)")
      .eq("purchase_orders.project_id", projectId),
    supabase
      .from("vendor_bills")
      .select("id, title, bill_number, amount, status, vendors(name), vendor_bill_allocations(id, amount, estimate_line_id)")
      .eq("project_id", projectId)
      .neq("status", "void"),
    supabase
      .from("invoice_line_items")
      .select("id, description, amount, estimate_line_id, invoices!inner(id, invoice_number, status, project_id)")
      .eq("invoices.project_id", projectId),
  ]);

  const lines = (lineRows ?? []) as CostPlanLine[];
  const takeoff = (takeoffRows ?? []) as TakeoffValue[];

  const totals = computeCostPlan(toLineInputs(lines), toTakeoffInputs(takeoff), {
    squareFeet: project?.square_footage ?? null,
    heatedSquareFeet: project?.heated_square_footage ?? null,
  });

  const rollup: Record<string, LineRollup> = {};
  for (const r of (rollupRows ?? []) as any[]) {
    rollup[r.id] = {
      committed: Number(r.committed ?? 0),
      actual: Number(r.actual ?? 0),
      billed: Number(r.billed ?? 0),
      remaining: Number(r.remaining ?? 0),
      po_count: Number(r.po_count ?? 0),
      bill_count: Number(r.bill_count ?? 0),
      invoice_count: Number(r.invoice_count ?? 0),
    };
  }

  const attribution: Record<string, LineAttribution[]> = {};
  const push = (lineId: string | null, entry: LineAttribution) => {
    if (!lineId) return;
    (attribution[lineId] ??= []).push(entry);
  };

  for (const row of (poRows ?? []) as any[]) {
    const po = Array.isArray(row.purchase_orders) ? row.purchase_orders[0] : row.purchase_orders;
    if (!po || !["issued", "billed", "closed"].includes(po.status)) continue;
    push(row.estimate_line_id, {
      kind: "po",
      id: row.id,
      label: row.description ?? "Purchase order",
      reference: po.po_number,
      status: po.status,
      amount: Number(row.amount ?? 0),
    });
  }

  const uncodedBills: CostPlan["uncoded"]["bills"] = [];
  for (const bill of (billRows ?? []) as any[]) {
    const vendor = Array.isArray(bill.vendors) ? bill.vendors[0] : bill.vendors;
    const allocations = (bill.vendor_bill_allocations ?? []) as any[];
    const allocated = allocations.reduce((s, a) => s + Number(a.amount ?? 0), 0);

    for (const a of allocations) {
      push(a.estimate_line_id, {
        kind: "bill",
        id: a.id,
        label: `${vendor?.name ?? "Vendor"} — ${bill.title}`,
        reference: bill.bill_number,
        status: bill.status,
        amount: Number(a.amount ?? 0),
      });
    }

    const total = Number(bill.amount ?? 0);
    if (total - allocated > 0.005) {
      uncodedBills.push({
        id: bill.id,
        vendorName: vendor?.name ?? "Vendor",
        billNumber: bill.bill_number,
        title: bill.title,
        amount: total,
        allocated,
      });
    }
  }

  const uncodedInvoiceLines: CostPlan["uncoded"]["invoiceLines"] = [];
  for (const row of (invoiceRows ?? []) as any[]) {
    const invoice = Array.isArray(row.invoices) ? row.invoices[0] : row.invoices;
    if (!invoice || ["draft", "void"].includes(invoice.status)) continue;

    if (row.estimate_line_id) {
      push(row.estimate_line_id, {
        kind: "invoice",
        id: row.id,
        label: row.description,
        reference: invoice.invoice_number,
        status: invoice.status,
        amount: Number(row.amount ?? 0),
      });
    } else {
      uncodedInvoiceLines.push({
        id: row.id,
        invoiceNumber: invoice.invoice_number,
        description: row.description,
        amount: Number(row.amount ?? 0),
      });
    }
  }

  return {
    lines,
    takeoff,
    totals,
    rollup,
    attribution,
    uncoded: { bills: uncodedBills, invoiceLines: uncodedInvoiceLines },
  };
}

/**
 * Recompute the plan, flush evaluated amounts back onto formula lines, and
 * refresh the project's headline estimate. Returns the fresh totals so a
 * caller can update the grid footer without a second round trip.
 */
export async function recalcCostPlan(supabase: Db, projectId: string): Promise<CostPlanTotals> {
  const { data: project } = await supabase
    .from("projects")
    .select("square_footage, heated_square_footage")
    .eq("id", projectId)
    .single();

  const { lines, totals } = await loadCostPlan(supabase, projectId, project ?? undefined);

  // Only write lines whose cached amount actually moved.
  const stale = lines.filter((line) => {
    if (!line.formula) return false;
    const computed = totals.byId[line.id];
    if (!computed || computed.error) return false;
    const cached = line.estimated_amount == null ? null : Number(line.estimated_amount);
    return cached == null || Math.abs(cached - computed.amount) > 0.005;
  });

  for (const line of stale) {
    await supabase
      .from("project_estimate_lines")
      .update({ estimated_amount: round2(totals.byId[line.id].amount) })
      .eq("id", line.id);
  }

  await supabase
    .from("projects")
    .update({
      estimated_cost: round2(totals.total),
      estimate_updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  return totals;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Grid rows grouped into the collapsible sections the template defines. */
export function groupLinesBySection(
  lines: CostPlanLine[]
): { section: string; lines: CostPlanLine[] }[] {
  const groups: { section: string; lines: CostPlanLine[] }[] = [];
  for (const line of lines) {
    const section = line.section ?? "Other";
    const last = groups[groups.length - 1];
    if (last && last.section === section) last.lines.push(line);
    else groups.push({ section, lines: [line] });
  }
  return groups;
}
