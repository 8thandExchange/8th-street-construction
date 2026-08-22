"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendAdminSms } from "@/lib/sms/ghl";
import { sendPushToAdmins } from "@/lib/notify/push";
import { trackWorkflowEvent } from "@/lib/analytics/track";
import {
  canTransitionService,
  defaultSlaDue,
  type ServiceCategory,
  type ServiceImageKind,
  type ServiceStatus,
} from "@/lib/construction/service-status";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function revalidate(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/service`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/client/projects/${projectId}/service`);
  revalidatePath(`/client/projects/${projectId}`);
}

const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];

async function nextNumber(projectId: string) {
  const supabase = createAdminClient();
  const { data: last } = await supabase
    .from("project_service_requests")
    .select("number")
    .eq("project_id", projectId)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (last?.number ?? 0) + 1;
}

async function uploadServicePhoto(input: {
  projectId: string;
  requestId: string;
  userId: string;
  file: File;
  kind: ServiceImageKind;
  caption?: string | null;
}) {
  if (input.file.size > 10 * 1024 * 1024) {
    return { error: "Photos must be 10 MB or smaller." };
  }
  if (!PHOTO_TYPES.includes(input.file.type)) {
    return { error: "Upload a PNG, JPEG, or WebP photo." };
  }
  const ext = input.file.type === "image/png" ? "png" : input.file.type === "image/webp" ? "webp" : "jpg";
  const storagePath = `${input.projectId}/service/${input.requestId}/${randomUUID()}.${ext}`;
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("project-documents")
    .upload(storagePath, Buffer.from(await input.file.arrayBuffer()), {
      contentType: input.file.type,
      upsert: false,
    });
  if (uploadError) return { error: `Could not upload the photo: ${uploadError.message}` };
  const { error: imageError } = await admin.from("project_service_images").insert({
    request_id: input.requestId,
    uploaded_by: input.userId,
    storage_path: storagePath,
    caption: input.caption || null,
    kind: input.kind,
  });
  if (imageError) {
    await admin.storage.from("project-documents").remove([storagePath]);
    return { error: imageError.message };
  }
  return { ok: true };
}

export async function createServiceRequest(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = str(formData, "project_id");
  const title = str(formData, "title");
  const description = str(formData, "description");
  if (!projectId || !title || !description) {
    throw new Error("A service request needs a title and a description");
  }

  const category = (str(formData, "category") || "warranty") as ServiceCategory;
  const slaDue = str(formData, "sla_due") || defaultSlaDue(new Date().toISOString().slice(0, 10), category);
  const ownerId = str(formData, "owner_id");
  const vendorId = str(formData, "vendor_id");
  const status: ServiceStatus = ownerId ? "assigned" : "open";

  const { data: created, error } = await supabase
    .from("project_service_requests")
    .insert({
      project_id: projectId,
      number: await nextNumber(projectId),
      title,
      description,
      location: str(formData, "location") || null,
      category,
      status,
      owner_id: ownerId || null,
      vendor_id: vendorId || null,
      sla_due: slaDue,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? "Could not create the request");

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const uploaded = await uploadServicePhoto({
      projectId,
      requestId: created.id,
      userId: user.id,
      file: photo,
      kind: "evidence",
      caption: title,
    });
    if (uploaded.error) throw new Error(uploaded.error);
  }

  await trackWorkflowEvent({
    workflow: "service",
    event: "start",
    entityId: created.id,
    projectId,
  });
  revalidate(projectId);
}

export async function setServiceRequestStatus(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const id = str(formData, "id");
  const projectId = str(formData, "project_id");
  const status = str(formData, "status") as ServiceStatus;
  const closeoutNote = str(formData, "closeout_note");

  const { data: row } = await supabase
    .from("project_service_requests")
    .select("id, status")
    .eq("id", id)
    .eq("project_id", projectId)
    .single();
  if (!row) throw new Error("Service request not found");
  if (!canTransitionService(row.status as ServiceStatus, status)) {
    throw new Error(`Cannot move a ${row.status} request to ${status}`);
  }
  if ((status === "resolved" || status === "closed") && !closeoutNote) {
    throw new Error("Write a closeout note before resolving the request");
  }

  const { error } = await supabase
    .from("project_service_requests")
    .update({
      status,
      closeout_note: closeoutNote || null,
      ...(status === "closed"
        ? { closed_at: new Date().toISOString(), closed_by: user.id }
        : {}),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const uploaded = await uploadServicePhoto({
      projectId,
      requestId: id,
      userId: user.id,
      file: photo,
      kind: status === "resolved" || status === "closed" ? "closeout" : "evidence",
      caption: closeoutNote || null,
    });
    if (uploaded.error) throw new Error(uploaded.error);
  }

  await trackWorkflowEvent({
    workflow: "service",
    event: status === "closed" ? "complete" : status === "void" ? "abandon" : "start",
    entityId: id,
    projectId,
  });
  revalidate(projectId);
}

export async function assignServiceRequest(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  const projectId = str(formData, "project_id");
  const ownerId = str(formData, "owner_id");
  const vendorId = str(formData, "vendor_id");

  const { data: row } = await supabase
    .from("project_service_requests")
    .select("id, status")
    .eq("id", id)
    .eq("project_id", projectId)
    .single();
  if (!row) throw new Error("Service request not found");

  const next: ServiceStatus =
    row.status === "open" && ownerId ? "assigned" : (row.status as ServiceStatus);
  if (next !== row.status && !canTransitionService(row.status as ServiceStatus, next)) {
    throw new Error(`Cannot assign a ${row.status} request`);
  }

  const { error } = await supabase
    .from("project_service_requests")
    .update({
      owner_id: ownerId || null,
      vendor_id: vendorId || null,
      status: next,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidate(projectId);
}

async function requireClientServiceAccess(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" } as const;
  const [{ data: profile }, { data: allowed }] = await Promise.all([
    supabase.from("profiles").select("role, portal_active").eq("id", user.id).single(),
    supabase.rpc("client_has_project_portal_access", { project_uuid: projectId }),
  ]);
  if (profile?.role !== "client" || !profile.portal_active || !allowed) {
    return { error: "Unauthorized" } as const;
  }
  return { supabase, user } as const;
}

export async function clientCreateServiceRequest(formData: FormData) {
  const projectId = str(formData, "project_id");
  const title = str(formData, "title");
  const description = str(formData, "description");
  if (!title || !description) {
    return { error: "Describe what needs attention." };
  }

  const auth = await requireClientServiceAccess(projectId);
  if ("error" in auth) return auth;

  const { data: project } = await auth.supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return { error: "You do not have access to this project" };

  const category = (str(formData, "category") || "warranty") as ServiceCategory;
  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("project_service_requests")
    .insert({
      project_id: projectId,
      number: await nextNumber(projectId),
      title,
      description,
      location: str(formData, "location") || null,
      category,
      status: "open",
      sla_due: defaultSlaDue(new Date().toISOString().slice(0, 10), category),
      created_by: auth.user.id,
    })
    .select("id, number")
    .single();
  if (error || !created) return { error: error?.message ?? "Could not file the request" };

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const uploaded = await uploadServicePhoto({
      projectId,
      requestId: created.id,
      userId: auth.user.id,
      file: photo,
      kind: "evidence",
      caption: title,
    });
    if (uploaded.error) {
      await admin.from("project_service_requests").delete().eq("id", created.id);
      return uploaded;
    }
  }

  await Promise.allSettled([
    sendAdminSms(`8th Street portal: service request #${created.number} on ${project.title}.`),
    sendPushToAdmins({
      title: project.title,
      body: `Service request: ${title}`,
      url: `/admin/projects/${projectId}/service`,
    }),
  ]);
  await trackWorkflowEvent({
    workflow: "service",
    event: "start",
    entityId: created.id,
    projectId,
  });
  revalidate(projectId);
  return { ok: true };
}

export async function clientConfirmServiceRequest(formData: FormData) {
  const projectId = str(formData, "project_id");
  const id = str(formData, "id");
  const note = str(formData, "closeout_note") || "Confirmed complete by the client.";

  const auth = await requireClientServiceAccess(projectId);
  if ("error" in auth) return auth;

  const { data: visible } = await auth.supabase
    .from("project_service_requests")
    .select("id, number, title, status")
    .eq("id", id)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!visible || visible.status !== "waiting_client") {
    return { error: "This request is not waiting on your confirmation." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("project_service_requests")
    .update({
      status: "resolved",
      closeout_note: note,
    })
    .eq("id", id)
    .eq("status", "waiting_client");
  if (error) return { error: error.message };

  await Promise.allSettled([
    sendAdminSms(`8th Street portal: service request #${visible.number} confirmed complete.`),
    sendPushToAdmins({
      title: "Service request confirmed",
      body: visible.title,
      url: `/admin/projects/${projectId}/service`,
    }),
  ]);
  await trackWorkflowEvent({
    workflow: "service",
    event: "complete",
    entityId: id,
    projectId,
  });
  revalidate(projectId);
  return { ok: true };
}
