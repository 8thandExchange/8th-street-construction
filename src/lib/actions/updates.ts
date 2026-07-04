"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendProjectUpdateEmail } from "@/lib/email/project-notify";
import { sendSms } from "@/lib/sms/ghl";
import { sendPushToProfile } from "@/lib/notify/push";

function revalidateProject(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/updates`);
  revalidatePath(`/client/projects/${projectId}`);
}

export async function createProjectUpdate(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const title = String(formData.get("title")).trim();
  const body = String(formData.get("body") || "").trim() || null;

  if (!title) return { error: "Title is required" };

  const { data: update, error } = await supabase
    .from("project_updates")
    .insert({
      project_id: projectId,
      author_id: user.id,
      title,
      body,
      visibility: "client",
    })
    .select("id")
    .single();

  if (error || !update) return { error: error?.message ?? "Could not create update" };

  const imageUrls = formData.getAll("image_urls").map(String).filter(Boolean);
  if (imageUrls.length > 0) {
    await supabase.from("project_update_images").insert(
      imageUrls.map((publicUrl, i) => ({
        update_id: update.id,
        storage_path: publicUrl.split("/project-updates/").pop() || publicUrl,
        public_url: publicUrl,
        display_order: i,
      }))
    );
  }

  // Clients are always notified of new updates — no opt-in checkbox to forget.
  {
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
        await sendProjectUpdateEmail({
          to: client.email,
          firstName: client.first_name || "there",
          projectTitle: project.title,
          updateTitle: title,
          projectId,
        });
      }
      await sendSms({
        phone: client?.phone,
        firstName: client?.first_name ?? undefined,
        message: `8th Street Construction: new progress update on ${project.title} — "${title}". See photos and details in your portal.`,
      });
      await sendPushToProfile(project.client_id, {
        title: project.title,
        body: `New progress update: ${title}`,
        url: `/client/projects/${projectId}/updates`,
      });
    }
  }

  revalidateProject(projectId);
  return { ok: true, updateId: update.id };
}

export async function deleteProjectUpdate(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  await supabase.from("project_updates").delete().eq("id", id);
  revalidateProject(projectId);
  return { ok: true };
}
