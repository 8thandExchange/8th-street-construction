"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";

/**
 * Inspections with real state. A failed inspection never gets edited
 * into a pass — the retest is a fresh row chained via reinspection_of,
 * so the paper trail an inspector or lender wants stays intact.
 */

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optional(formData: FormData, key: string) {
  const v = str(formData, key);
  return v || null;
}

function revalidate(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/inspections`);
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function createInspection(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = str(formData, "project_id");
  const title = str(formData, "title");
  if (!title) throw new Error("Give the inspection a name");

  const { error } = await supabase.from("project_inspections").insert({
    project_id: projectId,
    title,
    trade: optional(formData, "trade"),
    inspector: optional(formData, "inspector"),
    scheduled_date: optional(formData, "scheduled_date"),
    reinspection_of: optional(formData, "reinspection_of"),
  });
  if (error) throw new Error(error.message);
  revalidate(projectId);
}

export async function resultInspection(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = str(formData, "project_id");
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (!["passed", "failed", "waived"].includes(status))
    throw new Error("Unknown inspection result");

  const { error } = await supabase
    .from("project_inspections")
    .update({
      status,
      result_notes: optional(formData, "result_notes"),
      resulted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("project_id", projectId)
    .eq("status", "scheduled"); // results are written once, not edited
  if (error) throw new Error(error.message);
  revalidate(projectId);
}

export async function deleteInspection(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = str(formData, "project_id");
  const id = str(formData, "id");
  // Only an unresulted inspection can be deleted; results are records.
  const { error } = await supabase
    .from("project_inspections")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId)
    .eq("status", "scheduled");
  if (error) throw new Error(error.message);
  revalidate(projectId);
}
