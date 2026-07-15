"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendClientMessageAdminEmail,
  sendNewMessageEmail,
} from "@/lib/email/project-notify";
import { sendAdminSms, sendSms } from "@/lib/sms/ghl";
import { sendPushToAdmins, sendPushToProfile } from "@/lib/notify/push";

function revalidateProject(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/messages`);
  revalidatePath(`/client/projects/${projectId}/messages`);
}

export async function sendProjectMessage(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const body = String(formData.get("body")).trim();
  if (!body) return { error: "Message cannot be empty" };

  const { error } = await supabase.from("project_messages").insert({
    project_id: projectId,
    author_id: user.id,
    body,
    read_by: [user.id],
  });

  if (error) return { error: error.message };

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
      await sendNewMessageEmail({
        to: client.email,
        projectTitle: project.title,
        projectId,
        isClient: false,
      });
    }
    await sendSms({
      phone: client?.phone,
      firstName: client?.first_name ?? undefined,
      message: `8th Street Construction: new message from your project team on ${project.title}. Reply in your portal: ${process.env.NEXT_PUBLIC_SITE_URL || "https://www.8thstreetconstruction.com"}/client/projects/${projectId}/messages`,
    });
    await sendPushToProfile(project.client_id, {
      title: project.title,
      body: "New message from your project team",
      url: `/client/projects/${projectId}/messages`,
      tag: `msg-${projectId}`,
    });
  }

  revalidateProject(projectId);
  return { ok: true };
}

export async function sendClientMessage(formData: FormData) {
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const projectId = String(formData.get("project_id"));
  const body = String(formData.get("body")).trim();
  if (!body) return { error: "Message cannot be empty" };

  // Primary client OR added portal member — same rule the RLS insert policy enforces.
  const [{ data: project }, { data: allowed }] = await Promise.all([
    supabase.from("projects").select("title, client_id").eq("id", projectId).single(),
    supabase.rpc("client_has_project_portal_access", { project_uuid: projectId }),
  ]);

  if (!project || !allowed) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase.from("project_messages").insert({
    project_id: projectId,
    author_id: user.id,
    body,
    read_by: [user.id],
  });

  if (error) return { error: error.message };

  // Builder always hears about client messages — email every admin + SMS.
  const preview = body.length > 240 ? `${body.slice(0, 240)}…` : body;
  await sendClientMessageAdminEmail({
    projectTitle: project.title,
    projectId,
    preview,
  });
  await sendAdminSms(
    `8th Street portal: client message on ${project.title} — "${preview.slice(0, 120)}"`
  );
  await sendPushToAdmins({
    title: `Client message — ${project.title}`,
    body: preview.slice(0, 140),
    url: `/admin/projects/${projectId}/messages`,
    tag: `msg-${projectId}`,
  });

  revalidateProject(projectId);
  return { ok: true };
}
