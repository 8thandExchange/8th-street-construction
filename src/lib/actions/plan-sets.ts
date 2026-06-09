"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveJurisdiction } from "@/lib/building-regulations/registry";
import {
  sendPlanRevisionAdminEmail,
  sendPlanSetEmail,
  sendPlanSignedAdminEmail,
} from "@/lib/email/project-notify";

function revalidateProject(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/plans`);
  revalidatePath(`/client/projects/${projectId}/plans`);
  revalidatePath(`/client/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}`);
}

type PlanFileInput = {
  title: string;
  kind: string;
  storage_path: string;
  file_type?: string;
  file_size_bytes?: number;
};

export async function createPlanSet(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const title = String(formData.get("title")).trim();
  const description = String(formData.get("description") || "").trim() || null;
  const sendToClient = formData.get("send_to_client") === "on";

  if (!title) return { error: "Title is required" };

  const filesJson = String(formData.get("files_json") || "[]");
  let files: PlanFileInput[] = [];
  try {
    files = JSON.parse(filesJson) as PlanFileInput[];
  } catch {
    return { error: "Invalid file data" };
  }
  if (!files.length) return { error: "Upload at least one plan or rendering file" };

  const { data: project } = await supabase
    .from("projects")
    .select("jurisdiction, location")
    .eq("id", projectId)
    .single();

  const regulations = resolveJurisdiction(project?.jurisdiction, project?.location);

  const { data: last } = await supabase
    .from("project_plan_sets")
    .select("version")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (last?.version ?? 0) + 1;
  const status = sendToClient ? "pending_client" : "draft";

  const { data: planSet, error } = await supabase
    .from("project_plan_sets")
    .insert({
      project_id: projectId,
      version,
      title,
      description,
      status,
      jurisdiction_key: regulations?.key ?? null,
      regulations_snapshot: regulations,
      created_by: user.id,
      sent_to_client_at: sendToClient ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error || !planSet) return { error: error?.message ?? "Could not create plan set" };

  const fileRows = files.map((f, i) => ({
    plan_set_id: planSet.id,
    title: f.title.trim() || `File ${i + 1}`,
    kind: f.kind || "plan",
    storage_path: f.storage_path,
    file_type: f.file_type ?? null,
    file_size_bytes: f.file_size_bytes ?? null,
    display_order: i,
  }));

  const { error: filesErr } = await supabase.from("project_plan_files").insert(fileRows);
  if (filesErr) return { error: filesErr.message };

  if (sendToClient) {
    const admin = createAdminClient();
    const { data: proj } = await admin
      .from("projects")
      .select("title, client_id")
      .eq("id", projectId)
      .single();
    if (proj?.client_id) {
      const { data: client } = await admin
        .from("profiles")
        .select("email, first_name")
        .eq("id", proj.client_id)
        .single();
      if (client?.email) {
        await sendPlanSetEmail({
          to: client.email,
          firstName: client.first_name || "there",
          projectTitle: proj.title,
          planTitle: title,
          version,
          projectId,
        });
      }
    }
  }

  revalidateProject(projectId);
  return { ok: true };
}

export async function sendPlanSetToClient(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));

  const { data: planSet } = await supabase
    .from("project_plan_sets")
    .select("id, title, version, status")
    .eq("id", id)
    .single();

  if (!planSet) return { error: "Plan set not found" };
  if (planSet.status !== "draft" && planSet.status !== "revision_requested") {
    return { error: "This plan set cannot be sent again" };
  }

  const { error } = await supabase
    .from("project_plan_sets")
    .update({
      status: "pending_client",
      sent_to_client_at: new Date().toISOString(),
      revision_notes: null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  const admin = createAdminClient();
  const { data: proj } = await admin
    .from("projects")
    .select("title, client_id")
    .eq("id", projectId)
    .single();
  if (proj?.client_id) {
    const { data: client } = await admin
      .from("profiles")
      .select("email, first_name")
      .eq("id", proj.client_id)
      .single();
    if (client?.email) {
      await sendPlanSetEmail({
        to: client.email,
        firstName: client.first_name || "there",
        projectTitle: proj.title,
        planTitle: planSet.title,
        version: planSet.version,
        projectId,
      });
    }
  }

  revalidateProject(projectId);
  return { ok: true };
}

export async function deletePlanSet(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));

  const { data: files } = await supabase
    .from("project_plan_files")
    .select("storage_path")
    .eq("plan_set_id", id);

  if (files?.length) {
    await supabase.storage
      .from("project-documents")
      .remove(files.map((f) => f.storage_path));
  }

  await supabase.from("project_plan_sets").delete().eq("id", id);
  revalidateProject(projectId);
  return { ok: true };
}

export async function clientSignPlanSet(formData: FormData) {
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const signatureText = String(formData.get("signature_text") || "").trim();
  const acknowledgment = String(formData.get("acknowledgment") || "").trim();

  if (!signatureText) return { error: "Type your full legal name to sign off" };
  if (!acknowledgment) return { error: "Acknowledgment is required" };

  const { data: planSet } = await supabase
    .from("project_plan_sets")
    .select("id, title, version, status")
    .eq("id", id)
    .single();

  if (!planSet || planSet.status !== "pending_client") {
    return { error: "This plan set is not awaiting your sign-off" };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("client_id, title")
    .eq("id", projectId)
    .single();

  if (!project || project.client_id !== user.id) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("project_plan_sets")
    .update({
      status: "approved",
      client_signed_at: new Date().toISOString(),
      client_signed_by: user.id,
      client_signature_text: signatureText,
      client_acknowledgment: acknowledgment,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  await sendPlanSignedAdminEmail({
    projectTitle: project.title,
    planTitle: planSet.title,
    version: planSet.version,
    signatureText,
    projectId,
  });

  revalidateProject(projectId);
  return { ok: true };
}

export async function clientRequestPlanRevision(formData: FormData) {
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const revisionNotes = String(formData.get("revision_notes") || "").trim();

  if (!revisionNotes) return { error: "Describe what needs to change" };

  const { data: planSet } = await supabase
    .from("project_plan_sets")
    .select("id, title, version, status")
    .eq("id", id)
    .single();

  if (!planSet || planSet.status !== "pending_client") {
    return { error: "This plan set is not awaiting your response" };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("client_id, title")
    .eq("id", projectId)
    .single();

  if (!project || project.client_id !== user.id) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("project_plan_sets")
    .update({
      status: "revision_requested",
      revision_notes: revisionNotes,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  await sendPlanRevisionAdminEmail({
    projectTitle: project.title,
    planTitle: planSet.title,
    version: planSet.version,
    revisionNotes,
    projectId,
  });

  revalidateProject(projectId);
  return { ok: true };
}
