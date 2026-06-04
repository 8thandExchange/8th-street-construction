"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { CUSTOM_PHASE_KEY } from "@/lib/build/task-phases";

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
}

export async function toggleTaskDone(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const current = String(formData.get("current_status"));
  const next = current === "done" ? "todo" : "done";
  await updateTaskStatus(projectId, id, next);
}

export async function createTask(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const title = String(formData.get("title")).trim();
  if (!title) throw new Error("Title required");

  const milestoneId = String(formData.get("milestone_id") || "").trim() || null;
  const phaseKey =
    String(formData.get("phase_key") || "").trim() || CUSTOM_PHASE_KEY;
  const dueDate = String(formData.get("due_date") || "").trim() || null;

  const { data: maxOrder } = await supabase
    .from("project_tasks")
    .select("display_order")
    .eq("project_id", projectId)
    .eq("phase_key", phaseKey)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("project_tasks").insert({
    project_id: projectId,
    milestone_id: milestoneId,
    phase_key: phaseKey,
    title,
    description: String(formData.get("description") || "").trim() || null,
    priority: String(formData.get("priority") || "normal"),
    due_date: dueDate,
    status: "todo",
    display_order: (maxOrder?.display_order ?? -1) + 1,
    is_custom: true,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);
  revalidateProject(projectId);
}

export async function updateTask(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const title = String(formData.get("title")).trim();
  if (!title) throw new Error("Title required");

  const dueDate = String(formData.get("due_date") || "").trim() || null;
  const phaseKey = String(formData.get("phase_key") || "").trim() || null;

  let milestoneId: string | null = null;
  if (phaseKey && phaseKey !== CUSTOM_PHASE_KEY) {
    const { data: milestone } = await supabase
      .from("project_milestones")
      .select("id")
      .eq("project_id", projectId)
      .eq("phase_key", phaseKey)
      .maybeSingle();
    milestoneId = milestone?.id ?? null;
  }

  const { error } = await supabase
    .from("project_tasks")
    .update({
      title,
      description: String(formData.get("description") || "").trim() || null,
      priority: String(formData.get("priority") || "normal"),
      due_date: dueDate,
      ...(phaseKey ? { phase_key: phaseKey, milestone_id: milestoneId } : {}),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidateProject(projectId);
}

export async function deleteTask(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const { error } = await supabase.from("project_tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateProject(projectId);
}

export async function moveTaskPhase(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const phaseKey = String(formData.get("phase_key"));
  const milestoneId = String(formData.get("milestone_id") || "").trim() || null;

  const { error } = await supabase
    .from("project_tasks")
    .update({ phase_key: phaseKey, milestone_id: milestoneId })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidateProject(projectId);
}
