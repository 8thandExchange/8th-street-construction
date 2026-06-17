"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import {
  ESTIMATE_DIVISIONS,
  MACON_608_DIVISION_ESTIMATES,
  MACON_608_ESTIMATE_META,
  sumDivisionEstimates,
} from "@/lib/estimate/divisions";
import { isHabitat608Project } from "@/lib/billing/constants";

function revalidate(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}/costs`);
  revalidatePath(`/admin/projects/${projectId}/bid-requests`);
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
}

/** Import 608 Macon permit-set division estimates into the job (our cost plan — not client billing) */
export async function importMacon608Estimate(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));

  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();

  if (!isHabitat608Project(project?.slug ?? "")) {
    throw new Error("This import is only for 608 Macon Ave.");
  }

  const { count } = await supabase
    .from("project_estimate_lines")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if ((count ?? 0) > 0) {
    throw new Error("Cost plan already exists. Edit lines on the Cost Plan page.");
  }

  const directTotal = sumDivisionEstimates(MACON_608_DIVISION_ESTIMATES);
  const rows = ESTIMATE_DIVISIONS.map((div, i) => ({
    project_id: projectId,
    division_code: div.code,
    trade_label: div.tradeLabel,
    description: div.description,
    estimated_amount: MACON_608_DIVISION_ESTIMATES[div.code] ?? 0,
    display_order: i,
  }));

  const { error: lineErr } = await supabase.from("project_estimate_lines").insert(rows);
  if (lineErr) throw new Error(lineErr.message);

  await supabase
    .from("projects")
    .update({
      estimated_cost: directTotal,
      estimate_notes: `Imported from ${MACON_608_ESTIMATE_META.source}. Direct costs — refine as sub quotes arrive.`,
      estimate_updated_at: new Date().toISOString(),
      square_footage: MACON_608_ESTIMATE_META.heatedSquareFeet,
    })
    .eq("id", projectId);

  revalidate(projectId);
}

export async function updateEstimateLine(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const lineId = String(formData.get("line_id"));
  const estimated = Number(formData.get("estimated_amount"));
  const awardedRaw = formData.get("awarded_amount");
  const awarded =
    awardedRaw === "" || awardedRaw === null ? null : Number(awardedRaw);

  await supabase
    .from("project_estimate_lines")
    .update({
      estimated_amount: estimated,
      awarded_amount: awarded,
      notes: String(formData.get("notes") || "").trim() || null,
    })
    .eq("id", lineId);

  await recalcProjectEstimatedCost(supabase, projectId);
  revalidate(projectId);
}

export async function updateProjectEstimatedCost(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const total = Number(formData.get("estimated_cost"));

  await supabase
    .from("projects")
    .update({
      estimated_cost: total,
      estimate_notes: String(formData.get("estimate_notes") || "").trim() || null,
      estimate_updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  revalidate(projectId);
}

async function recalcProjectEstimatedCost(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  projectId: string
) {
  const { data: lines } = await supabase
    .from("project_estimate_lines")
    .select("estimated_amount")
    .eq("project_id", projectId);

  const total = (lines ?? []).reduce((s, l) => s + Number(l.estimated_amount ?? 0), 0);

  await supabase
    .from("projects")
    .update({
      estimated_cost: total,
      estimate_updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);
}

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

  await recalcProjectEstimatedCost(supabase, projectId);
  revalidate(projectId);
}
