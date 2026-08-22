"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminSms } from "@/lib/sms/ghl";
import { sendPushToAdmins } from "@/lib/notify/push";
import { trackWorkflowEvent } from "@/lib/analytics/track";

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
  await trackWorkflowEvent({ workflow: "punch", event: "complete", projectId });
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
  const id = String(formData.get("id"));
  const { data: images } = await supabase
    .from("punch_list_images")
    .select("storage_path")
    .eq("punch_item_id", id);
  await supabase.from("punch_list_items").delete().eq("id", id);
  const paths = (images ?? []).map((image) => image.storage_path);
  if (paths.length) await supabase.storage.from("project-documents").remove(paths);
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

async function requireClientPunchAccess(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" } as const;
  const [{ data: profile }, { data: allowed }] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, portal_active")
      .eq("id", user.id)
      .single(),
    supabase.rpc("client_has_project_portal_access", { project_uuid: projectId }),
  ]);
  if (profile?.role !== "client" || !profile.portal_active || !allowed) {
    return { error: "Unauthorized" } as const;
  }
  return { supabase, user } as const;
}

export async function clientCreatePunchItem(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  if (!title) return { error: "Describe the item you want the team to review." };

  const auth = await requireClientPunchAccess(projectId);
  if ("error" in auth) return auth;
  const admin = createAdminClient();
  const { data: item, error } = await admin
    .from("punch_list_items")
    .insert({
      project_id: projectId,
      title,
      description,
      location,
      status: "open",
      priority: "normal",
      created_by: auth.user.id,
    })
    .select("id")
    .single();
  if (error || !item) return { error: error?.message ?? "Could not add the punch item" };

  const upload = formData.get("photo");
  if (upload instanceof File && upload.size > 0) {
    if (upload.size > 10 * 1024 * 1024) {
      await admin.from("punch_list_items").delete().eq("id", item.id);
      return { error: "Punch-list photos must be 10 MB or smaller." };
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(upload.type)) {
      await admin.from("punch_list_items").delete().eq("id", item.id);
      return { error: "Upload a PNG, JPEG, or WebP photo." };
    }
    const ext = upload.type === "image/png" ? "png" : upload.type === "image/webp" ? "webp" : "jpg";
    const storagePath = `${projectId}/punch/${item.id}/${randomUUID()}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from("project-documents")
      .upload(storagePath, Buffer.from(await upload.arrayBuffer()), {
        contentType: upload.type,
        upsert: false,
      });
    if (uploadError) {
      await admin.from("punch_list_items").delete().eq("id", item.id);
      return { error: `Could not upload the photo: ${uploadError.message}` };
    }
    const { error: imageError } = await admin.from("punch_list_images").insert({
      punch_item_id: item.id,
      uploaded_by: auth.user.id,
      storage_path: storagePath,
      caption: title,
    });
    if (imageError) {
      await admin.storage.from("project-documents").remove([storagePath]);
      await admin.from("punch_list_items").delete().eq("id", item.id);
      return { error: imageError.message };
    }
  }

  await Promise.allSettled([
    sendAdminSms(`8th Street portal: client added a punch-list item — "${title}".`),
    sendPushToAdmins({
      title: "New client punch-list item",
      body: title,
      url: `/admin/projects/${projectId}/punch-list`,
    }),
  ]);
  await trackWorkflowEvent({
    workflow: "punch",
    event: "complete",
    entityId: item.id,
    projectId,
  });
  revalidate(projectId);
  return { ok: true };
}

export async function clientAddPunchComment(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write a comment first." };
  if (body.length > 2000) return { error: "Comments must be 2,000 characters or less." };

  const auth = await requireClientPunchAccess(projectId);
  if ("error" in auth) return auth;
  const { data: item } = await auth.supabase
    .from("punch_list_items")
    .select("id, title")
    .eq("id", itemId)
    .eq("project_id", projectId)
    .single();
  if (!item) return { error: "Punch item not found" };

  const admin = createAdminClient();
  const { error } = await admin.from("punch_list_comments").insert({
    punch_item_id: itemId,
    author_id: auth.user.id,
    body,
  });
  if (error) return { error: error.message };

  await sendPushToAdmins({
    title: "New punch-list comment",
    body: `${item.title}: ${body.slice(0, 120)}`,
    url: `/admin/projects/${projectId}/punch-list`,
  });
  revalidate(projectId);
  return { ok: true };
}
