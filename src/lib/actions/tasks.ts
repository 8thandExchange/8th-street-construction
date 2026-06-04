"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";

function revalidateProject(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}/tasks`);
  revalidatePath(`/admin/projects/${projectId}/build`);
  revalidatePath(`/admin/projects/${projectId}/milestones`);
  revalidatePath(`/client/projects/${projectId}`);
}

export async function updateTaskStatus(
  projectId: string,
  taskId: string,
  status: string
) {
  const { supabase } = await requireAdmin();
  const payload: Record<string, unknown> = { status };
  if (status === "done") {
    payload.completed_at = new Date().toISOString();
  } else {
    payload.completed_at = null;
  }
  await supabase.from("project_tasks").update(payload).eq("id", taskId);
  revalidateProject(projectId);
  return { ok: true };
}

export async function toggleTaskDone(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const current = String(formData.get("current_status"));
  const next = current === "done" ? "todo" : "done";
  await updateTaskStatus(projectId, id, next);
  return { ok: true };
}

export async function createTask(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const title = String(formData.get("title")).trim();
  if (!title) return { error: "Title required" };

  const milestoneId = String(formData.get("milestone_id") || "").trim() || null;
  const phaseKey = String(formData.get("phase_key") || "").trim() || null;

  const { data: maxOrder } = await supabase
    .from("project_tasks")
    .select("display_order")
    .eq("project_id", projectId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("project_tasks").insert({
    project_id: projectId,
    milestone_id: milestoneId,
    phase_key: phaseKey,
    title,
    description: String(formData.get("description") || "").trim() || null,
    priority: String(formData.get("priority") || "normal"),
    status: "todo",
    display_order: (maxOrder?.display_order ?? -1) + 1,
    created_by: user.id,
  });

  revalidateProject(projectId);
  return { ok: true };
}

export async function deleteTask(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  await supabase.from("project_tasks").delete().eq("id", id);
  revalidateProject(projectId);
  return { ok: true };
}
