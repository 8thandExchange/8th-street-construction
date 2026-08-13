import {
  computeBenchmarks,
  type CostSnapshotRow,
  type LineBenchmark,
} from "./benchmarks";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

/**
 * Load every job's recorded actuals and collapse them into per-code
 * benchmarks. Pass excludeProjectId so a job never benchmarks against
 * itself while it's the one being estimated.
 */
export async function loadCostBenchmarks(
  supabase: Db,
  opts?: { excludeProjectId?: string }
): Promise<Record<string, LineBenchmark>> {
  const { data } = await supabase
    .from("project_cost_snapshots")
    .select(
      "project_id, code, trade_label, line_type, budget, actual, heated_square_footage, captured_at, projects(title)"
    );

  const rows: CostSnapshotRow[] = ((data ?? []) as any[]).map((r) => ({
    project_id: r.project_id,
    project_title:
      (Array.isArray(r.projects) ? r.projects[0]?.title : r.projects?.title) ?? null,
    code: r.code,
    trade_label: r.trade_label,
    line_type: r.line_type,
    budget: r.budget == null ? null : Number(r.budget),
    actual: Number(r.actual ?? 0),
    heated_square_footage:
      r.heated_square_footage == null ? null : Number(r.heated_square_footage),
    captured_at: r.captured_at,
  }));

  return computeBenchmarks(rows, opts);
}

/** When this project's actuals were last recorded, if ever. */
export async function loadLastSnapshotAt(supabase: Db, projectId: string): Promise<string | null> {
  const { data } = await supabase
    .from("project_cost_snapshots")
    .select("captured_at")
    .eq("project_id", projectId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.captured_at ?? null;
}
