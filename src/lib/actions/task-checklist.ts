"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";

/**
 * Checklist items under a build task, each optionally proven by a field
 * photo. The photo upload happens client-side (same storage flow as
 * project documents); these actions record the result.
 */

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function revalidate(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/tasks`);
  revalidatePath(`/admin/projects/${projectId}/build`);
}

/** The task must belong to the project the form claims, or nothing happens. */
async function assertTaskInProject(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  taskId: string,
  projectId: string
) {
  const { data: task } = await supabase
    .from("project_tasks")
    .select("id, project_id")
    .eq("id", taskId)
    .single();
  if (!task || task.project_id !== projectId) throw new Error("Task not found");
}

export async function addChecklistItem(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = str(formData, "project_id");
  const taskId = str(formData, "task_id");
  const label = str(formData, "label");
  if (!label) throw new Error("Give the checklist item a label");
  await assertTaskInProject(supabase, taskId, projectId);

  const { data: last } = await supabase
    .from("task_checklist_items")
    .select("display_order")
    .eq("task_id", taskId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("task_checklist_items").insert({
    task_id: taskId,
    label,
    display_order: (last?.display_order ?? 0) + 1,
  });
  if (error) throw new Error(error.message);
  revalidate(projectId);
}

/**
 * Toggle done. When a photo path arrives with it (the take-a-picture
 * flow), the photo is stored as the proof and the item is marked done in
 * the same stroke.
 */
export async function setChecklistItemDone(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = str(formData, "project_id");
  const id = str(formData, "id");
  const done = str(formData, "done") === "true";
  const photoPath = str(formData, "photo_path");

  const { data: item } = await supabase
    .from("task_checklist_items")
    .select("id, task_id")
    .eq("id", id)
    .single();
  if (!item) throw new Error("Checklist item not found");
  await assertTaskInProject(supabase, item.task_id, projectId);

  const patch: Record<string, unknown> = {
    done,
    done_at: done ? new Date().toISOString() : null,
    done_by: done ? user.id : null,
  };
  // A photo only ever attaches; unchecking keeps it as history.
  if (photoPath) patch.photo_path = photoPath;

  const { error } = await supabase
    .from("task_checklist_items")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidate(projectId);
}

export async function deleteChecklistItem(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = str(formData, "project_id");
  const id = str(formData, "id");

  const { data: item } = await supabase
    .from("task_checklist_items")
    .select("id, task_id")
    .eq("id", id)
    .single();
  if (!item) return;
  await assertTaskInProject(supabase, item.task_id, projectId);

  const { error } = await supabase.from("task_checklist_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate(projectId);
}
