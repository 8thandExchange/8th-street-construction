"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { trackWorkflowEvent } from "@/lib/analytics/track";
import {
  canTransitionSubmittal,
  type SubmittalStatus,
} from "@/lib/construction/review-status";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function revalidate(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/rfis`);
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function createSubmittal(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = str(formData, "project_id");
  const title = str(formData, "title");
  if (!projectId || !title) throw new Error("A submittal needs a title");

  const submitNow = formData.get("submit_now") === "on";
  const { data: last } = await supabase
    .from("project_submittals")
    .select("number")
    .eq("project_id", projectId)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("project_submittals").insert({
    project_id: projectId,
    number: (last?.number ?? 0) + 1,
    title,
    trade: str(formData, "trade") || null,
    spec_section: str(formData, "spec_section") || null,
    plan_set_id: str(formData, "plan_set_id") || null,
    document_id: str(formData, "document_id") || null,
    notes: str(formData, "notes") || null,
    due_date: str(formData, "due_date") || null,
    status: submitNow ? "submitted" : "draft",
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  await trackWorkflowEvent({
    workflow: "submittal",
    event: "start",
    projectId,
  });
  revalidate(projectId);
}

export async function decideSubmittal(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const id = str(formData, "id");
  const projectId = str(formData, "project_id");
  const status = str(formData, "status") as SubmittalStatus;

  const { data: row } = await supabase
    .from("project_submittals")
    .select("id, status")
    .eq("id", id)
    .eq("project_id", projectId)
    .single();
  if (!row) throw new Error("Submittal not found");

  const from = row.status as SubmittalStatus;
  if (!canTransitionSubmittal(from, status)) {
    throw new Error(`Cannot move a ${from} submittal to ${status}`);
  }

  const decided = ["approved", "approved_as_noted", "rejected"].includes(status);
  const { error } = await supabase
    .from("project_submittals")
    .update({
      status,
      reviewer_notes: str(formData, "reviewer_notes") || null,
      ...(decided
        ? { decided_at: new Date().toISOString(), decided_by: user.id }
        : {}),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await trackWorkflowEvent({
    workflow: "submittal",
    event: decided ? "complete" : status === "void" ? "abandon" : "start",
    entityId: id,
    projectId,
  });
  revalidate(projectId);
}
