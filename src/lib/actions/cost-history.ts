"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { round2 } from "@/lib/estimate/cost-plan";

/**
 * Recording a project's realized costs into history — the return edge of
 * the estimating loop. Reads the same rollup view the budget grid shows,
 * so what gets remembered is exactly what the grid said.
 */

export type SnapshotState =
  | { status: "idle" }
  | { status: "captured"; lines: number; capturedAt: string }
  | { status: "error"; message: string };

export async function recordCostSnapshot(formData: FormData): Promise<{
  lines: number;
  capturedAt: string;
}> {
  const { supabase, user } = await requireAdmin();
  const projectId = String(formData.get("project_id") ?? "").trim();
  if (!projectId) throw new Error("Missing project");

  const [{ data: project }, { data: rollupRows }, { data: lineRows }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, square_footage, heated_square_footage")
      .eq("id", projectId)
      .single(),
    supabase
      .from("project_cost_line_rollup")
      .select("id, code, section, trade_label, line_type, budget, committed, actual, billed")
      .eq("project_id", projectId),
    supabase
      .from("project_estimate_lines")
      .select("id, unit, is_allowance")
      .eq("project_id", projectId),
  ]);

  if (!project) throw new Error("Project not found");

  const lineMeta = new Map(
    (lineRows ?? []).map((l: { id: string; unit: string | null; is_allowance: boolean }) => [
      l.id,
      l,
    ])
  );

  const capturedAt = new Date().toISOString();
  const rows = (rollupRows ?? [])
    .map((r: Record<string, unknown>) => ({
      project_id: projectId,
      estimate_line_id: r.id as string,
      code: (r.code as string | null) ?? null,
      section: (r.section as string | null) ?? null,
      trade_label: (r.trade_label as string) ?? "Line",
      line_type: (r.line_type as string) ?? "cost",
      unit: lineMeta.get(r.id as string)?.unit ?? null,
      is_allowance: lineMeta.get(r.id as string)?.is_allowance ?? false,
      budget: r.budget == null ? null : round2(Number(r.budget)),
      committed: round2(Number(r.committed ?? 0)),
      actual: round2(Number(r.actual ?? 0)),
      billed: round2(Number(r.billed ?? 0)),
      square_footage: project.square_footage ?? null,
      heated_square_footage: project.heated_square_footage ?? null,
      captured_at: capturedAt,
      captured_by: user.id,
    }))
    // A line with no budget and no money on it teaches nothing — skip it.
    .filter((r) => (r.budget ?? 0) > 0 || r.committed > 0 || r.actual > 0 || r.billed > 0);

  if (!rows.length)
    throw new Error("Nothing to record yet — this cost plan has no budgets or spend.");

  // Replace wholesale: the snapshot is "the truth now", not an event log.
  const { error: delErr } = await supabase
    .from("project_cost_snapshots")
    .delete()
    .eq("project_id", projectId);
  if (delErr) throw new Error(delErr.message);

  const { error: insErr } = await supabase.from("project_cost_snapshots").insert(rows);
  if (insErr) throw new Error(insErr.message);

  revalidatePath(`/admin/projects/${projectId}/costs`);
  return { lines: rows.length, capturedAt };
}

/** useActionState wrapper so the button can show what happened. */
export async function recordCostSnapshotAction(
  _prev: SnapshotState,
  formData: FormData
): Promise<SnapshotState> {
  try {
    const { lines, capturedAt } = await recordCostSnapshot(formData);
    return { status: "captured", lines, capturedAt };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Recording actuals failed.",
    };
  }
}
