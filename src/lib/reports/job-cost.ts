/**
 * Cross-project job costing — the company-wide lens the per-project cost
 * plan can't give. Pure aggregation over project_cost_line_rollup rows;
 * the page queries, this file only computes, so the math is testable.
 */

export type JobCostRollupRow = {
  project_id: string;
  section: string | null;
  line_type: string;
  budget: number | null;
  committed: number;
  actual: number;
  billed: number;
  co_approved: number;
  revised_budget: number | null;
};

export type JobCostProject = {
  id: string;
  title: string;
  status: string | null;
  contract_value: number | null;
  heated_square_footage: number | null;
};

export type JobCostRow = {
  projectId: string;
  title: string;
  status: string | null;
  /** Budget including approved change orders. */
  revisedBudget: number;
  coApproved: number;
  committed: number;
  actual: number;
  /** What the job has consumed: committed and actual overlap once a PO is
   *  billed, so the larger of the two — never their sum. */
  spent: number;
  remaining: number;
  contract: number | null;
  /** Contract minus revised budget: the margin IF the job lands on budget. */
  marginAtBudget: number | null;
  spentPerHeatedSqft: number | null;
};

export type TradeCostRow = {
  section: string;
  revisedBudget: number;
  actual: number;
  /** Distinct projects with real spend in this section. */
  projectCount: number;
  /** (actual - budget) / budget across the section, where budget exists. */
  variancePct: number | null;
};

export function aggregateJobCosts(
  projects: JobCostProject[],
  rows: JobCostRollupRow[]
): JobCostRow[] {
  const byProject = new Map<string, JobCostRollupRow[]>();
  for (const r of rows) {
    if (r.line_type !== "cost") continue;
    (byProject.get(r.project_id) ?? byProject.set(r.project_id, []).get(r.project_id)!).push(r);
  }

  const out: JobCostRow[] = [];
  for (const p of projects) {
    const lines = byProject.get(p.id);
    if (!lines?.length) continue;

    const sum = (f: (r: JobCostRollupRow) => number) =>
      round2(lines.reduce((s, r) => s + f(r), 0));

    const revisedBudget = sum((r) => Number(r.revised_budget ?? r.budget ?? 0));
    const committed = sum((r) => Number(r.committed));
    const actual = sum((r) => Number(r.actual));
    const spent = Math.max(committed, actual);
    const contract = p.contract_value == null ? null : Number(p.contract_value);
    const sqft = Number(p.heated_square_footage);

    out.push({
      projectId: p.id,
      title: p.title,
      status: p.status,
      revisedBudget,
      coApproved: sum((r) => Number(r.co_approved)),
      committed,
      actual,
      spent,
      remaining: round2(revisedBudget - spent),
      contract,
      marginAtBudget: contract == null ? null : round2(contract - revisedBudget),
      spentPerHeatedSqft: sqft > 0 && spent > 0 ? round2(spent / sqft) : null,
    });
  }

  // Biggest jobs first — the ones worth watching.
  return out.sort((a, b) => b.revisedBudget - a.revisedBudget);
}

export function aggregateTradeCosts(rows: JobCostRollupRow[]): TradeCostRow[] {
  const bySection = new Map<string, JobCostRollupRow[]>();
  for (const r of rows) {
    if (r.line_type !== "cost") continue;
    const key = r.section ?? "Other";
    (bySection.get(key) ?? bySection.set(key, []).get(key)!).push(r);
  }

  const out: TradeCostRow[] = [];
  for (const [section, group] of bySection) {
    const withSpend = group.filter((r) => Number(r.actual) > 0);
    if (!withSpend.length) continue;

    const budget = round2(
      withSpend.reduce((s, r) => s + Number(r.revised_budget ?? r.budget ?? 0), 0)
    );
    const actual = round2(withSpend.reduce((s, r) => s + Number(r.actual), 0));

    out.push({
      section,
      revisedBudget: budget,
      actual,
      projectCount: new Set(withSpend.map((r) => r.project_id)).size,
      variancePct: budget > 0 ? Math.round(((actual - budget) / budget) * 1000) / 1000 : null,
    });
  }

  // Worst overruns first.
  return out.sort((a, b) => (b.variancePct ?? -Infinity) - (a.variancePct ?? -Infinity));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
