"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";

function revalidate(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/punch-list`);
  revalidatePath(`/client/projects/${projectId}/punch-list`);
}

export async function createPunchItem(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = String(formData.get("project_id"));

  const { error } = await supabase.from("punch_list_items").insert({
    project_id: projectId,
    location: String(formData.get("location") || "").trim() || null,
    title: String(formData.get("title")).trim(),
    description: String(formData.get("description") || "").trim() || null,
    priority: String(formData.get("priority") || "normal"),
    assigned_trade: String(formData.get("assigned_trade") || "").trim() || null,
    due_date: String(formData.get("due_date") || "").trim() || null,
    status: "open",
    created_by: user.id,
  });

  if (error) throw new Error(error.message);
  revalidate(projectId);
}

export async function updatePunchItem(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));

  const { error } = await supabase
    .from("punch_list_items")
    .update({
      location: String(formData.get("location") || "").trim() || null,
      title: String(formData.get("title")).trim(),
      description: String(formData.get("description") || "").trim() || null,
      priority: String(formData.get("priority") || "normal"),
      assigned_trade: String(formData.get("assigned_trade") || "").trim() || null,
      due_date: String(formData.get("due_date") || "").trim() || null,
      status,
      completed_at: status === "complete" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidate(projectId);
}

export async function deletePunchItem(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  await supabase.from("punch_list_items").delete().eq("id", String(formData.get("id")));
  revalidate(projectId);
}

export async function togglePunchComplete(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const id = String(formData.get("id"));
  const current = String(formData.get("current_status"));
  const next = current === "complete" ? "open" : "complete";

  await supabase
    .from("punch_list_items")
    .update({
      status: next,
      completed_at: next === "complete" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  revalidate(projectId);
}
