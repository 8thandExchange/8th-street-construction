"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";

function revalidateProject(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}/milestones`);
  revalidatePath(`/client/projects/${projectId}`);
}

export async function createMilestone(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const title = String(formData.get("title")).trim();
  if (!title) return { error: "Title is required" };

  const { data: maxOrder } = await supabase
    .from("project_milestones")
    .select("display_order")
    .eq("project_id", projectId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("project_milestones").insert({
    project_id: projectId,
    title,
    description: String(formData.get("description") || "").trim() || null,
    target_date: String(formData.get("target_date") || "").trim() || null,
    status: "pending",
    display_order: (maxOrder?.display_order ?? -1) + 1,
  });

  if (error) return { error: error.message };
  revalidateProject(projectId);
  return { ok: true };
}

export async function updateMilestone(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const status = String(formData.get("status"));

  const payload: Record<string, unknown> = {
    title: String(formData.get("title")).trim(),
    description: String(formData.get("description") || "").trim() || null,
    target_date: String(formData.get("target_date") || "").trim() || null,
    status,
  };

  if (status === "completed") {
    payload.completed_at = new Date().toISOString();
  } else {
    payload.completed_at = null;
  }

  const { error } = await supabase.from("project_milestones").update(payload).eq("id", id);
  if (error) return { error: error.message };
  revalidateProject(projectId);
  return { ok: true };
}

export async function deleteMilestone(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const { error } = await supabase.from("project_milestones").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateProject(projectId);
  return { ok: true };
}

export async function reorderMilestones(projectId: string, orderedIds: string[]) {
  const { supabase } = await requireAdmin();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("project_milestones")
        .update({ display_order: index })
        .eq("id", id)
        .eq("project_id", projectId)
    )
  );
  revalidateProject(projectId);
  return { ok: true };
}

export async function setMilestoneStatus(
  projectId: string,
  milestoneId: string,
  status: string
) {
  const { supabase } = await requireAdmin();
  const payload: Record<string, unknown> = { status };
  if (status === "completed") {
    payload.completed_at = new Date().toISOString();
  } else {
    payload.completed_at = null;
  }
  await supabase.from("project_milestones").update(payload).eq("id", milestoneId);
  revalidateProject(projectId);
  return { ok: true };
}
