"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";

function revalidate(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/daily-logs`);
}

export async function createDailyLog(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = String(formData.get("project_id"));

  const { error } = await supabase.from("project_daily_logs").insert({
    project_id: projectId,
    log_date: String(formData.get("log_date")),
    weather: String(formData.get("weather") || "").trim() || null,
    crew_count: formData.get("crew_count") ? Number(formData.get("crew_count")) : null,
    summary: String(formData.get("summary")).trim(),
    issues: String(formData.get("issues") || "").trim() || null,
    author_id: user.id,
  });

  if (error) return { error: error.message };
  revalidate(projectId);
  return { ok: true };
}

export async function deleteDailyLog(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const id = String(formData.get("id"));

  const { error } = await supabase.from("project_daily_logs").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidate(projectId);
  return { ok: true };
}
