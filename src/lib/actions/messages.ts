"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNewMessageEmail } from "@/lib/email/project-notify";

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
      .select("email")
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

  const { data: project } = await supabase
    .from("projects")
    .select("title, client_id")
    .eq("id", projectId)
    .single();

  if (!project || project.client_id !== user.id) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase.from("project_messages").insert({
    project_id: projectId,
    author_id: user.id,
    body,
    read_by: [user.id],
  });

  if (error) return { error: error.message };

  revalidateProject(projectId);
  return { ok: true };
}
