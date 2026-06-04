"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";

function revalidate(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/schedule`);
  revalidatePath(`/admin/projects/${projectId}/milestones`);
  revalidatePath(`/client/projects/${projectId}`);
}

export async function updateMilestoneSchedule(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const id = String(formData.get("id"));

  const { error } = await supabase
    .from("project_milestones")
    .update({
      scheduled_start: String(formData.get("scheduled_start") || "").trim() || null,
      scheduled_end: String(formData.get("scheduled_end") || "").trim() || null,
      target_date: String(formData.get("target_date") || "").trim() || null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidate(projectId);
}

export async function updateProjectSchedule(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));

  const { error } = await supabase
    .from("projects")
    .update({
      start_date: String(formData.get("start_date") || "").trim() || null,
      target_completion_date:
        String(formData.get("target_completion_date") || "").trim() || null,
    })
    .eq("id", projectId);

  if (error) throw new Error(error.message);
  revalidate(projectId);
}
