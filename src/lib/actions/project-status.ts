"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";

const PROJECT_STATUSES = [
  "draft",
  "pre_construction",
  "in_progress",
  "completed",
  "on_hold",
  "archived",
];

const MILESTONE_STATUSES = ["pending", "in_progress", "completed", "blocked"];

const TASK_STATUSES = ["todo", "in_progress", "blocked", "done", "cancelled"];

/** Inline-edit a project's status from the master board or projects list. */
export async function setProjectStatusAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!PROJECT_STATUSES.includes(status)) {
    throw new Error("Invalid project status");
  }

  const { data: existing } = await supabase
    .from("projects")
    .select("published_at, slug")
    .eq("id", id)
    .single();

  const payload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status !== "draft" && !existing?.published_at) {
    payload.published_at = new Date().toISOString();
  }

  const { error } = await supabase.from("projects").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/projects/${id}`);
  revalidatePath("/admin/projects");
  revalidatePath("/admin");
  revalidatePath("/projects");
  revalidatePath("/");
  if (existing?.slug) revalidatePath(`/projects/${existing.slug}`);
}

/** Inline-edit a milestone's status. */
export async function setMilestoneStatusAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const status = String(formData.get("status"));
  if (!MILESTONE_STATUSES.includes(status)) {
    throw new Error("Invalid milestone status");
  }

  const payload: Record<string, unknown> = { status };
  payload.completed_at = status === "completed" ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("project_milestones")
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}/build`);
  revalidatePath(`/admin/projects/${projectId}/schedule`);
  revalidatePath(`/client/projects/${projectId}`);
  revalidatePath(`/client/projects/${projectId}/schedule`);
}

/** Inline-edit a task's status. */
export async function setTaskStatusAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const status = String(formData.get("status"));
  if (!TASK_STATUSES.includes(status)) {
    throw new Error("Invalid task status");
  }

  const payload: Record<string, unknown> = { status };
  payload.completed_at = status === "done" ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("project_tasks")
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}/tasks`);
  revalidatePath(`/admin/projects/${projectId}/build`);
  revalidatePath(`/client/projects/${projectId}`);
}
