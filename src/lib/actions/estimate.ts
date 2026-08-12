"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { recalcCostPlan } from "@/lib/estimate/cost-plan";

function revalidate(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}/costs`);
  revalidatePath(`/admin/projects/${projectId}/bid-requests`);
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
}

/**
 * Notes and, optionally, a manual total override. The cost plan normally keeps
 * `estimated_cost` current on its own, so a form that only edits notes should
 * leave the amount field out rather than posting back a value it read earlier.
 */
export async function updateProjectEstimatedCost(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));

  const patch: Record<string, unknown> = {
    estimate_notes: String(formData.get("estimate_notes") || "").trim() || null,
    estimate_updated_at: new Date().toISOString(),
  };

  const totalRaw = formData.get("estimated_cost");
  if (totalRaw != null && String(totalRaw).trim() !== "") {
    const total = Number(totalRaw);
    if (Number.isFinite(total)) patch.estimated_cost = total;
  }

  await supabase.from("projects").update(patch).eq("id", projectId);

  revalidate(projectId);
}

/** Awarding a bid writes the winning number onto its cost line. */
export async function linkAwardedBidToLine(
  projectId: string,
  estimateLineId: string,
  bidRequestId: string,
  awardedAmount: number
) {
  const { supabase } = await requireAdmin();

  await supabase
    .from("project_estimate_lines")
    .update({
      awarded_amount: awardedAmount,
      bid_request_id: bidRequestId,
    })
    .eq("id", estimateLineId);

  await supabase
    .from("bid_requests")
    .update({ estimate_line_id: estimateLineId })
    .eq("id", bidRequestId);

  // Full recalculation, not a sum of the amount column — markup lines live in
  // that column too, and formula lines need re-evaluating first.
  await recalcCostPlan(supabase, projectId);
  revalidate(projectId);
}
