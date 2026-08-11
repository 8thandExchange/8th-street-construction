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

export type CostPlan = {
  lines: CostPlanLine[];
  takeoff: TakeoffValue[];
  totals: CostPlanTotals;
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
  const [{ data: lineRows }, { data: takeoffRows }] = await Promise.all([
    supabase.from("project_estimate_lines").select(LINE_COLUMNS).eq("project_id", projectId).order("display_order"),
    supabase.from("project_takeoff_values").select(TAKEOFF_COLUMNS).eq("project_id", projectId).order("display_order"),
  ]);

  const lines = (lineRows ?? []) as CostPlanLine[];
  const takeoff = (takeoffRows ?? []) as TakeoffValue[];

  const totals = computeCostPlan(toLineInputs(lines), toTakeoffInputs(takeoff), {
    squareFeet: project?.square_footage ?? null,
    heatedSquareFeet: project?.heated_square_footage ?? null,
  });

  return { lines, takeoff, totals };
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
