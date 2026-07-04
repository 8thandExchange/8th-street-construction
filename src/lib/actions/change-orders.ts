"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendChangeOrderDecisionAdminEmail,
  sendChangeOrderEmail,
} from "@/lib/email/project-notify";
import { sendAdminSms, sendSms } from "@/lib/sms/ghl";
import { sendPushToAdmins, sendPushToProfile } from "@/lib/notify/push";

function revalidateProject(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/change-orders`);
  revalidatePath(`/client/projects/${projectId}/change-orders`);
  revalidatePath(`/client/projects/${projectId}`);
}

export async function createChangeOrder(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const title = String(formData.get("title")).trim();
  const description = String(formData.get("description")).trim();
  const sendToClient = formData.get("send_to_client") === "on";

  if (!title || !description) return { error: "Title and description are required" };

  const { data: last } = await supabase
    .from("change_orders")
    .select("number")
    .eq("project_id", projectId)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const number = (last?.number ?? 0) + 1;
  const costImpact = formData.get("cost_impact")
    ? Number(formData.get("cost_impact"))
    : null;
  const scheduleDays = formData.get("schedule_impact_days")
    ? Number(formData.get("schedule_impact_days"))
    : null;

  const status = sendToClient ? "pending_client" : "draft";

  const { error } = await supabase.from("change_orders").insert({
    project_id: projectId,
    number,
    title,
    description,
    cost_impact: costImpact,
    schedule_impact_days: scheduleDays,
    status,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  if (sendToClient) {
    const admin = createAdminClient();
    const { data: project } = await admin
      .from("projects")
      .select("title, client_id")
      .eq("id", projectId)
      .single();
    if (project?.client_id) {
      const { data: client } = await admin
        .from("profiles")
        .select("email, phone, first_name")
        .eq("id", project.client_id)
        .single();
      if (client?.email) {
        await sendChangeOrderEmail({
          to: client.email,
          firstName: client.first_name || "there",
          projectTitle: project.title,
          coNumber: number,
          coTitle: title,
          projectId,
        });
      }
      await sendSms({
        phone: client?.phone,
        firstName: client?.first_name ?? undefined,
        message: `8th Street Construction: change order #${number} on ${project.title} needs your review — approve or decline in your portal.`,
      });
      await sendPushToProfile(project.client_id, {
        title: project.title,
        body: `Change order #${number} needs your review`,
        url: `/client/projects/${projectId}/change-orders`,
      });
    }
  }

  revalidateProject(projectId);
  return { ok: true };
}

export async function clientRespondChangeOrder(formData: FormData) {
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const decision = String(formData.get("decision"));

  if (decision !== "approved" && decision !== "rejected") {
    return { error: "Invalid decision" };
  }

  const { data: co } = await supabase
    .from("change_orders")
    .select("id, status, cost_impact, project_id, number, title")
    .eq("id", id)
    .single();

  if (!co || co.status !== "pending_client") {
    return { error: "Change order is not awaiting your response" };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("client_id, contract_value")
    .eq("id", projectId)
    .single();

  if (!project || project.client_id !== user.id) {
    return { error: "Unauthorized" };
  }

  await supabase
    .from("change_orders")
    .update({
      status: decision,
      client_signed_at: new Date().toISOString(),
      client_signed_by: user.id,
    })
    .eq("id", id);

  if (decision === "approved" && co.cost_impact && project.contract_value != null) {
    await supabase
      .from("projects")
      .update({
        contract_value: Number(project.contract_value) + Number(co.cost_impact),
      })
      .eq("id", projectId);
  }

  // The builder always hears about the client's decision.
  const { data: projectMeta } = await supabase
    .from("projects")
    .select("title")
    .eq("id", projectId)
    .single();
  const projectTitle = projectMeta?.title ?? "your project";
  await sendChangeOrderDecisionAdminEmail({
    projectTitle,
    projectId,
    coNumber: Number(co.number),
    coTitle: co.title ?? "Change order",
    decision,
    costImpact: co.cost_impact != null ? Number(co.cost_impact) : null,
  });
  await sendAdminSms(
    `8th Street portal: change order #${co.number} ${decision === "approved" ? "APPROVED" : "DECLINED"} by client on ${projectTitle}.`
  );
  await sendPushToAdmins({
    title: projectTitle,
    body: `Change order #${co.number} ${decision === "approved" ? "approved" : "declined"} by client`,
    url: `/admin/projects/${projectId}/change-orders`,
  });

  revalidateProject(projectId);
  return { ok: true };
}

export async function deleteChangeOrder(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  await supabase.from("change_orders").delete().eq("id", id);
  revalidateProject(projectId);
  return { ok: true };
}
