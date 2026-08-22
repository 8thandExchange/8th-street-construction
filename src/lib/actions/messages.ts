"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
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

export type MessageAttachment = {
  path: string;
  name: string;
  type: string;
  size: number;
};

async function uploadMessageAttachment(
  projectId: string,
  formData: FormData
): Promise<MessageAttachment | null> {
  const upload = formData.get("attachment");
  if (!(upload instanceof File) || upload.size === 0) return null;
  if (upload.size > 10 * 1024 * 1024) throw new Error("Attachments must be 10 MB or smaller.");
  const allowed = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
  ]);
  if (!allowed.has(upload.type)) throw new Error("Attach a PDF, PNG, JPEG, or WebP file.");
  const safeName =
    upload.name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-") || "attachment";
  const path = `${projectId}/messages/${randomUUID()}-${safeName}`;
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from("project-documents")
    .upload(path, Buffer.from(await upload.arrayBuffer()), {
      contentType: upload.type,
      upsert: false,
    });
  if (error) throw new Error(`Could not upload the attachment: ${error.message}`);
  return { path, name: upload.name, type: upload.type, size: upload.size };
}

export async function sendProjectMessage(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const body = String(formData.get("body")).trim();
  if (!body) return { error: "Message cannot be empty" };
  let attachment: MessageAttachment | null;
  try {
    attachment = await uploadMessageAttachment(projectId, formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Attachment upload failed" };
  }

  const { error } = await supabase.from("project_messages").insert({
    project_id: projectId,
    author_id: user.id,
    body,
    read_by: [user.id],
    attachments: attachment ? [attachment] : [],
  });

  if (error) {
    if (attachment) {
      await createAdminClient().storage.from("project-documents").remove([attachment.path]);
    }
    return { error: error.message };
  }

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
  const admin = createAdminClient();
  let attachment: MessageAttachment | null;
  try {
    attachment = await uploadMessageAttachment(projectId, formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Attachment upload failed" };
  }

  const { error } = await admin.from("project_messages").insert({
    project_id: projectId,
    author_id: user.id,
    body,
    read_by: [user.id],
    attachments: attachment ? [attachment] : [],
  });

  if (error) {
    if (attachment) {
      await createAdminClient().storage.from("project-documents").remove([attachment.path]);
    }
    return { error: error.message };
  }

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

/** Mark all visible messages read by the current viewer. */
export async function markProjectMessagesRead(projectId: string) {
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, portal_active")
    .eq("id", user.id)
    .single();
  if (!profile) return;
  if (profile.role !== "admin") {
    if (profile.role !== "client" || !profile.portal_active) return;
    const { data: allowed } = await supabase.rpc("client_has_project_portal_access", {
      project_uuid: projectId,
    });
    if (!allowed) return;
  }

  const admin = createAdminClient();
  const { data: messages } = await admin
    .from("project_messages")
    .select("id, read_by")
    .eq("project_id", projectId);
  await Promise.all(
    (messages ?? [])
      .filter((message) => {
        const readers = Array.isArray(message.read_by) ? message.read_by.map(String) : [];
        return !readers.includes(user.id);
      })
      .map((message) => {
        const readers = Array.isArray(message.read_by) ? message.read_by.map(String) : [];
        return admin
          .from("project_messages")
          .update({ read_by: [...readers, user.id] })
          .eq("id", message.id);
      })
  );
}
