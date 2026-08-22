"use server";

import { revalidatePath } from "next/cache";
import { requireCapability, requireProjectStaff } from "@/lib/actions/admin-auth";
import { trackWorkflowEvent } from "@/lib/analytics/track";
import { isoWeekStart, isMonday, parseCrewCount } from "@/lib/planning/crew-capacity";

function revalidateCrew(projectId: string) {
  revalidatePath("/admin/planning");
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}/daily-logs`);
}

export async function saveCrewWeek(formData: FormData) {
  await requireCapability("field.write");
  const projectId = String(formData.get("project_id") ?? "").trim();
  if (!projectId) throw new Error("Missing project");
  const { supabase, user } = await requireProjectStaff(projectId);

  const weekStart = isoWeekStart(String(formData.get("week_start") ?? ""));
  if (!isMonday(weekStart)) throw new Error("Crew weeks start on Monday.");
  const planned = parseCrewCount(formData.get("planned_crew"));
  if (planned == null) throw new Error("Enter how many people this job needs.");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { data: existing } = await supabase
    .from("project_crew_weeks")
    .select("id")
    .eq("project_id", projectId)
    .eq("week_start", weekStart)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("project_crew_weeks")
        .update({ planned_crew: planned, notes })
        .eq("id", existing.id)
    : await supabase.from("project_crew_weeks").insert({
        project_id: projectId,
        week_start: weekStart,
        planned_crew: planned,
        notes,
        created_by: user.id,
      });
  if (error) throw new Error(error.message);

  const { error: defaultError } = await supabase
    .from("projects")
    .update({ planned_crew: planned })
    .eq("id", projectId);
  if (defaultError) throw new Error(defaultError.message);

  await trackWorkflowEvent({
    workflow: "crew_plan",
    event: "complete",
    entityId: projectId,
    projectId,
    metadata: { week_start: weekStart, planned_crew: planned },
  });

  revalidateCrew(projectId);
}
