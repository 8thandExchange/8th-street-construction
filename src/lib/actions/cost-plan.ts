"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { evaluateFormula, FormulaError, type CostPlanTotals } from "@/lib/estimate/formula";
import { loadCostPlan, recalcCostPlan, round2 } from "@/lib/estimate/cost-plan";

function revalidate(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}/costs`);
  revalidatePath(`/admin/projects/${projectId}/purchase-orders`);
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
}

export type CostPlanResult =
  | { ok: true; totals: SerializedTotals }
  | { ok: false; error: string };

/** Only what the grid footer and cells need — the full object has closures-free data anyway. */
export type SerializedTotals = {
  byId: Record<string, { amount: number; derived: boolean; error: string | null }>;
  subtotal: number;
  markup: number;
  contingency: number;
  total: number;
  perSqft: number | null;
  perHeatedSqft: number | null;
  takeoffScope: Record<string, number>;
  takeoffErrors: Record<string, string>;
};

function serialize(totals: CostPlanTotals): SerializedTotals {
  return {
    byId: Object.fromEntries(
      Object.entries(totals.byId).map(([id, l]) => [id, { amount: l.amount, derived: l.derived, error: l.error }])
    ),
    subtotal: totals.subtotal,
    markup: totals.markup,
    contingency: totals.contingency,
    total: totals.total,
    perSqft: totals.perSqft,
    perHeatedSqft: totals.perHeatedSqft,
    takeoffScope: totals.takeoffScope,
    takeoffErrors: totals.takeoffErrors,
  };
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Copy a template into a job — cost lines and the takeoff variables the
 * formulas reference. Refuses to run over an existing plan; wiping a job's
 * budget is not something a single click should be able to do.
 */
export async function startCostPlanFromTemplate(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const templateId = String(formData.get("template_id"));

  const { count } = await supabase
    .from("project_estimate_lines")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if ((count ?? 0) > 0) {
    throw new Error("This job already has a cost plan. Edit it on the Cost Plan page.");
  }

  const [{ data: templateLines }, { data: templateTakeoff }] = await Promise.all([
    supabase
      .from("cost_code_template_lines")
      .select("id, code, label, section, division_code, line_type, unit, formula, default_amount, is_allowance, display_order")
      .eq("template_id", templateId)
      .order("display_order"),
    supabase
      .from("cost_code_template_takeoff")
      .select("id, key, label, unit, default_value, formula, section, display_order")
      .eq("template_id", templateId)
      .order("display_order"),
  ]);

  if (!templateLines?.length) throw new Error("That template has no lines.");

  if (templateTakeoff?.length) {
    const { error } = await supabase.from("project_takeoff_values").insert(
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      templateTakeoff.map((t: any) => ({
        project_id: projectId,
        key: t.key,
        label: t.label,
        unit: t.unit,
        value: t.default_value,
        formula: t.formula,
        section: t.section,
        display_order: t.display_order,
        template_takeoff_id: t.id,
      }))
    );
    if (error) throw new Error(error.message);
  }

  const { error: lineErr } = await supabase.from("project_estimate_lines").insert(
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    templateLines.map((l: any) => ({
      project_id: projectId,
      code: l.code,
      trade_label: l.label,
      section: l.section,
      division_code: l.division_code ?? "DIV-01",
      line_type: l.line_type,
      unit: l.unit,
      formula: l.formula,
      estimated_amount: l.default_amount ?? 0,
      is_allowance: l.is_allowance,
      display_order: l.display_order,
      template_line_id: l.id,
    }))
  );
  if (lineErr) throw new Error(lineErr.message);

  await recalcCostPlan(supabase, projectId);
  revalidate(projectId);
}

/* ------------------------------------------------------------------ */
/* Attribution — coding real money to cost lines (Phase B).             */
/* Plain form posts: these change server-rendered rollups, so letting   */
/* revalidatePath re-render beats syncing client state.                 */
/* ------------------------------------------------------------------ */

/**
 * Code some or all of a vendor bill to a cost line. Re-coding the same bill to
 * the same line replaces the amount rather than stacking a second row.
 */
export async function allocateVendorBill(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const billId = String(formData.get("bill_id"));
  const lineId = String(formData.get("line_id"));
  const amount = Number(formData.get("amount"));

  if (!lineId) throw new Error("Pick a cost code.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter an amount above zero.");

  const { data: bill } = await supabase
    .from("vendor_bills")
    .select("amount, project_id")
    .eq("id", billId)
    .single();

  if (!bill) throw new Error("That bill no longer exists.");
  if (bill.project_id !== projectId) throw new Error("That bill belongs to a different job.");

  const { data: existing } = await supabase
    .from("vendor_bill_allocations")
    .select("id, amount, estimate_line_id")
    .eq("vendor_bill_id", billId);

  const otherLines = (existing ?? []).filter((a) => a.estimate_line_id !== lineId);
  const otherTotal = otherLines.reduce((s, a) => s + Number(a.amount ?? 0), 0);

  if (otherTotal + amount > Number(bill.amount) + 0.005) {
    const left = Number(bill.amount) - otherTotal;
    throw new Error(`Only ${left.toFixed(2)} of this bill is left to code.`);
  }

  const { error } = await supabase
    .from("vendor_bill_allocations")
    .upsert(
      { vendor_bill_id: billId, estimate_line_id: lineId, amount: round2(amount) },
      { onConflict: "vendor_bill_id,estimate_line_id" }
    );
  if (error) throw new Error(error.message);

  revalidate(projectId);
}

export async function removeVendorBillAllocation(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));

  const { error } = await supabase
    .from("vendor_bill_allocations")
    .delete()
    .eq("id", String(formData.get("allocation_id")));
  if (error) throw new Error(error.message);

  revalidate(projectId);
}

/**
 * Point a billing line at a cost code. Independent of its city budget line —
 * one records what the money was spent on, the other which city line pays.
 */
export async function setInvoiceLineCostCode(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const lineId = String(formData.get("line_id")) || null;

  const { error } = await supabase
    .from("invoice_line_items")
    .update({ estimate_line_id: lineId })
    .eq("id", String(formData.get("invoice_line_id")));
  if (error) throw new Error(error.message);

  revalidate(projectId);
}

/* ------------------------------------------------------------------ */
/* Template maintenance — rare, so plain form posts rather than a grid. */
/* ------------------------------------------------------------------ */

export async function updateTemplateLine(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const lineId = String(formData.get("line_id"));

  const formula = String(formData.get("formula") || "").trim() || null;
  const amountRaw = String(formData.get("default_amount") || "").trim();

  if (formula) {
    // Validate against the template's own takeoff keys, with every key at 1 so
    // a divide-by-zero in real data doesn't block saving a sound expression.
    const { data: line } = await supabase
      .from("cost_code_template_lines")
      .select("template_id")
      .eq("id", lineId)
      .single();

    const { data: keys } = await supabase
      .from("cost_code_template_takeoff")
      .select("key")
      .eq("template_id", line?.template_id);

    const scope: Record<string, number> = { subtotal: 1 };
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    for (const k of keys ?? []) scope[(k as any).key] = 1;

    try {
      evaluateFormula(formula, scope);
    } catch (err) {
      throw new Error(`Formula problem: ${message(err)}`);
    }
  }

  await supabase
    .from("cost_code_template_lines")
    .update({
      label: String(formData.get("label") || "").trim(),
      formula,
      default_amount: amountRaw === "" ? null : round2(Number(amountRaw)),
      is_allowance: formData.get("is_allowance") === "on",
    })
    .eq("id", lineId);

  revalidatePath("/admin/settings/cost-codes");
}

export async function updateTemplateTakeoff(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const valueRaw = String(formData.get("default_value") || "").trim();

  await supabase
    .from("cost_code_template_takeoff")
    .update({
      label: String(formData.get("label") || "").trim(),
      default_value: valueRaw === "" ? null : Number(valueRaw),
    })
    .eq("id", String(formData.get("takeoff_id")));

  revalidatePath("/admin/settings/cost-codes");
}

/** Edit one cell. Called on blur, so it has to be cheap and forgiving. */
export async function updateCostLine(input: {
  projectId: string;
  lineId: string;
  patch: {
    trade_label?: string;
    estimated_amount?: number | null;
    formula?: string | null;
    notes?: string | null;
    is_allowance?: boolean;
  };
}): Promise<CostPlanResult> {
  try {
    const { supabase } = await requireAdmin();
    const patch: Record<string, unknown> = {};

    if (input.patch.trade_label !== undefined) {
      const label = input.patch.trade_label.trim();
      if (!label) return { ok: false, error: "Description can't be empty." };
      patch.trade_label = label;
    }

    if (input.patch.formula !== undefined) {
      const formula = input.patch.formula?.trim() || null;
      if (formula) {
        // Validate against this job's real takeoff before storing it.
        const { takeoff, totals } = await loadCostPlan(supabase, input.projectId);
        const scope: Record<string, number> = { subtotal: totals.subtotal };
        for (const t of takeoff) scope[t.key] = Number(t.value ?? 0);
        try {
          evaluateFormula(formula, scope);
        } catch (err) {
          if (err instanceof FormulaError) return { ok: false, error: err.message };
          throw err;
        }
      }
      patch.formula = formula;
    }

    if (input.patch.estimated_amount !== undefined) {
      const amount = input.patch.estimated_amount;
      if (amount != null && !Number.isFinite(amount)) {
        return { ok: false, error: "That isn't a number." };
      }
      patch.estimated_amount = amount == null ? null : round2(amount);
    }

    if (input.patch.notes !== undefined) patch.notes = input.patch.notes?.trim() || null;
    if (input.patch.is_allowance !== undefined) patch.is_allowance = input.patch.is_allowance;

    const { error } = await supabase.from("project_estimate_lines").update(patch).eq("id", input.lineId);
    if (error) return { ok: false, error: error.message };

    const totals = await recalcCostPlan(supabase, input.projectId);
    revalidate(input.projectId);
    return { ok: true, totals: serialize(totals) };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

export async function updateTakeoffValue(input: {
  projectId: string;
  takeoffId: string;
  patch: { value?: number | null; formula?: string | null };
}): Promise<CostPlanResult> {
  try {
    const { supabase } = await requireAdmin();
    const patch: Record<string, unknown> = {};

    if (input.patch.value !== undefined) {
      if (input.patch.value != null && !Number.isFinite(input.patch.value)) {
        return { ok: false, error: "That isn't a number." };
      }
      patch.value = input.patch.value;
    }
    if (input.patch.formula !== undefined) patch.formula = input.patch.formula?.trim() || null;

    const { error } = await supabase.from("project_takeoff_values").update(patch).eq("id", input.takeoffId);
    if (error) return { ok: false, error: error.message };

    const totals = await recalcCostPlan(supabase, input.projectId);
    revalidate(input.projectId);

    const failure = Object.entries(totals.takeoffErrors)[0];
    if (failure) return { ok: false, error: `${failure[0]}: ${failure[1]}` };

    return { ok: true, totals: serialize(totals) };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

export async function addCostLine(input: {
  projectId: string;
  section: string;
  afterDisplayOrder: number;
}): Promise<CostPlanResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("project_estimate_lines").insert({
      project_id: input.projectId,
      trade_label: "New line",
      section: input.section,
      division_code: "DIV-01",
      line_type: "cost",
      estimated_amount: 0,
      display_order: input.afterDisplayOrder + 1,
    });
    if (error) return { ok: false, error: error.message };

    const totals = await recalcCostPlan(supabase, input.projectId);
    revalidate(input.projectId);
    return { ok: true, totals: serialize(totals) };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

/**
 * Deleting a line that a PO or bid already points at would silently orphan
 * committed money, so it is refused rather than cascaded.
 */
export async function deleteCostLine(input: {
  projectId: string;
  lineId: string;
}): Promise<CostPlanResult> {
  try {
    const { supabase } = await requireAdmin();

    const { count: bidCount } = await supabase
      .from("bid_requests")
      .select("id", { count: "exact", head: true })
      .eq("estimate_line_id", input.lineId);

    if ((bidCount ?? 0) > 0) {
      return { ok: false, error: "A bid request points at this line. Unlink it first." };
    }

    const { error } = await supabase.from("project_estimate_lines").delete().eq("id", input.lineId);
    if (error) return { ok: false, error: error.message };

    const totals = await recalcCostPlan(supabase, input.projectId);
    revalidate(input.projectId);
    return { ok: true, totals: serialize(totals) };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}
