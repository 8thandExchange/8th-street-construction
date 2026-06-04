"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";

function revalidateProject(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/documents`);
  revalidatePath(`/client/projects/${projectId}`);
}

export async function createProjectDocument(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const title = String(formData.get("title")).trim();
  const storagePath = String(formData.get("storage_path")).trim();
  const fileType = String(formData.get("file_type") || "").trim() || null;
  const fileSize = formData.get("file_size_bytes")
    ? Number(formData.get("file_size_bytes"))
    : null;

  if (!title || !storagePath) return { error: "Title and file are required" };

  const { error } = await supabase.from("project_documents").insert({
    project_id: projectId,
    uploaded_by: user.id,
    title,
    description: String(formData.get("description") || "").trim() || null,
    storage_path: storagePath,
    file_type: fileType,
    file_size_bytes: fileSize,
    category: String(formData.get("category") || "other"),
    visibility: String(formData.get("visibility") || "client"),
  });

  if (error) return { error: error.message };
  revalidateProject(projectId);
  return { ok: true };
}

export async function deleteProjectDocument(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const { data: doc } = await supabase
    .from("project_documents")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (doc?.storage_path) {
    await supabase.storage.from("project-documents").remove([doc.storage_path]);
  }
  await supabase.from("project_documents").delete().eq("id", id);
  revalidateProject(projectId);
  return { ok: true };
}

export async function updateDocumentVisibility(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const visibility = String(formData.get("visibility"));
  await supabase.from("project_documents").update({ visibility }).eq("id", id);
  revalidateProject(projectId);
  return { ok: true };
}
