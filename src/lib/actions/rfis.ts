"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendAdminSms } from "@/lib/sms/ghl";
import { sendPushToAdmins } from "@/lib/notify/push";
import { trackWorkflowEvent } from "@/lib/analytics/track";
import { canTransitionRfi, type RfiStatus } from "@/lib/construction/review-status";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function revalidate(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/rfis`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/client/projects/${projectId}/rfis`);
  revalidatePath(`/client/projects/${projectId}`);
}

export async function createRfi(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = str(formData, "project_id");
  const title = str(formData, "title");
  const question = str(formData, "question");
  if (!projectId || !title || !question) throw new Error("An RFI needs a title and a question");

  const send = formData.get("send_to_client") === "on";
  const { data: last } = await supabase
    .from("project_rfis")
    .select("number")
    .eq("project_id", projectId)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("project_rfis").insert({
    project_id: projectId,
    number: (last?.number ?? 0) + 1,
    title,
    question,
    trade: str(formData, "trade") || null,
    plan_set_id: str(formData, "plan_set_id") || null,
    milestone_id: str(formData, "milestone_id") || null,
    schedule_impact: str(formData, "schedule_impact") || "none",
    days_impact: str(formData, "days_impact") ? Number(str(formData, "days_impact")) : null,
    status: send ? "open" : "draft",
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  await trackWorkflowEvent({
    workflow: "rfi",
    event: "start",
    projectId,
  });
  revalidate(projectId);
}

export async function setRfiStatus(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  const projectId = str(formData, "project_id");
  const status = str(formData, "status") as RfiStatus;

  const { data: rfi } = await supabase
    .from("project_rfis")
    .select("id, status")
    .eq("id", id)
    .eq("project_id", projectId)
    .single();
  if (!rfi) throw new Error("RFI not found");
  if (!canTransitionRfi(rfi.status as RfiStatus, status)) {
    throw new Error(`Cannot move an ${rfi.status} RFI to ${status}`);
  }

  const { error } = await supabase.from("project_rfis").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  if (status === "closed" || status === "void") {
    await trackWorkflowEvent({
      workflow: "rfi",
      event: status === "void" ? "abandon" : "complete",
      entityId: id,
      projectId,
    });
  }
  revalidate(projectId);
}

export async function clientAnswerRfi(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const projectId = str(formData, "project_id");
  const id = str(formData, "id");
  const answer = str(formData, "answer");
  if (!answer) return { error: "Write an answer" };

  const { data: project } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return { error: "You do not have access to this project" };

  const { data: visible } = await supabase
    .from("project_rfis")
    .select("id, number, title, status")
    .eq("id", id)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!visible || visible.status !== "open") {
    return { error: "This RFI is not waiting on an answer" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("project_rfis")
    .update({
      status: "answered",
      answer,
      answered_at: new Date().toISOString(),
      answered_by: user.id,
    })
    .eq("id", id)
    .eq("status", "open");
  if (error) return { error: error.message };

  await Promise.allSettled([
    sendAdminSms(`8th Street portal: RFI #${visible.number} answered on ${project.title}.`),
    sendPushToAdmins({
      title: project.title,
      body: `RFI #${visible.number} answered: ${visible.title}`,
      url: `/admin/projects/${projectId}/rfis`,
    }),
  ]);
  await trackWorkflowEvent({
    workflow: "rfi",
    event: "complete",
    entityId: id,
    projectId,
  });
  revalidate(projectId);
  return { ok: true };
}
