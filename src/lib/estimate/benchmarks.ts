/**
 * Turning cost history into numbers an estimator can price from.
 *
 * Snapshots are per-line captures of budget vs actual taken at project
 * closeout (project_cost_snapshots). A benchmark aggregates them by cost
 * code across jobs: what a line actually ran, per heated square foot, and
 * how far off our budgets tend to be. Pure functions — the loader queries,
 * this file only computes — so the math is unit-testable.
 */

export type CostSnapshotRow = {
  project_id: string;
  /** Joined from projects for "last job" labeling. */
  project_title: string | null;
  code: string | null;
  trade_label: string;
  line_type: string;
  budget: number | null;
  actual: number;
  heated_square_footage: number | null;
  captured_at: string;
};

export type LineBenchmark = {
  code: string;
  tradeLabel: string;
  /** Distinct jobs with real spend on this code. */
  projectCount: number;
  avgActual: number;
  lastActual: number;
  lastProject: string | null;
  /** Average of actual / heated sqft across jobs that recorded sqft. */
  avgPerHeatedSqft: number | null;
  /**
   * Mean of (actual - budget) / budget across jobs where both are set.
   * Positive means this line typically runs over what we budgeted.
   */
  avgVariancePct: number | null;
};

/**
 * Aggregate snapshots by code. Only cost lines with real spend count —
 * a zero-actual line teaches nothing. Pass excludeProjectId to keep the
 * job being estimated out of its own benchmarks.
 */
export function computeBenchmarks(
  rows: CostSnapshotRow[],
  opts?: { excludeProjectId?: string }
): Record<string, LineBenchmark> {
  const byCode = new Map<string, CostSnapshotRow[]>();

  for (const row of rows) {
    if (!row.code) continue;
    if (row.line_type !== "cost") continue;
    if (opts?.excludeProjectId && row.project_id === opts.excludeProjectId) continue;
    const actual = Number(row.actual);
    if (!Number.isFinite(actual) || actual <= 0) continue;
    (byCode.get(row.code) ?? byCode.set(row.code, []).get(row.code)!).push(row);
  }

  const benchmarks: Record<string, LineBenchmark> = {};

  for (const [code, group] of byCode) {
    const latest = group.reduce((a, b) =>
      new Date(b.captured_at).getTime() >= new Date(a.captured_at).getTime() ? b : a
    );

    const perSqft = group
      .filter((r) => Number(r.heated_square_footage) > 0)
      .map((r) => Number(r.actual) / Number(r.heated_square_footage));

    const variances = group
      .filter((r) => Number(r.budget) > 0)
      .map((r) => (Number(r.actual) - Number(r.budget)) / Number(r.budget));

    benchmarks[code] = {
      code,
      tradeLabel: latest.trade_label,
      projectCount: new Set(group.map((r) => r.project_id)).size,
      avgActual: round2(mean(group.map((r) => Number(r.actual)))),
      lastActual: round2(Number(latest.actual)),
      lastProject: latest.project_title,
      avgPerHeatedSqft: perSqft.length ? round2(mean(perSqft)) : null,
      avgVariancePct: variances.length ? Math.round(mean(variances) * 1000) / 1000 : null,
    };
  }

  return benchmarks;
}

/** One line of history, phrased for a tooltip or an AI prompt. */
export function describeBenchmark(b: LineBenchmark): string {
  const bits = [
    `avg actual $${b.avgActual.toLocaleString()} across ${b.projectCount} job${b.projectCount === 1 ? "" : "s"}`,
  ];
  if (b.lastProject) bits.push(`last $${b.lastActual.toLocaleString()} (${b.lastProject})`);
  if (b.avgPerHeatedSqft != null) bits.push(`$${b.avgPerHeatedSqft.toLocaleString()}/heated sqft`);
  if (b.avgVariancePct != null && Math.abs(b.avgVariancePct) >= 0.02) {
    const pct = Math.round(Math.abs(b.avgVariancePct) * 100);
    bits.push(`typically ${b.avgVariancePct > 0 ? `+${pct}% over` : `-${pct}% under`} budget`);
  }
  return bits.join(" · ");
}

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
