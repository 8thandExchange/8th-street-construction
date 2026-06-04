"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";

function revalidate(projectId: string, slug?: string) {
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}/overview`);
  revalidatePath("/admin/projects");
  revalidatePath("/projects");
  revalidatePath("/");
  if (slug) revalidatePath(`/projects/${slug}`);
}

export async function updateProject(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));

  const { data: existing } = await supabase
    .from("projects")
    .select("status, published_at, slug")
    .eq("id", id)
    .single();

  const slug = String(formData.get("slug")).trim().toLowerCase();
  const payload: Record<string, unknown> = {
    slug,
    title: String(formData.get("title")).trim(),
    subtitle: String(formData.get("subtitle") || "").trim() || null,
    category: String(formData.get("category")),
    status,
    excerpt: String(formData.get("excerpt") || "").trim() || null,
    narrative: String(formData.get("narrative") || "").trim() || null,
    hero_image_url: String(formData.get("hero_image_url") || "").trim() || null,
    location: String(formData.get("location") || "").trim() || null,
    year_completed: formData.get("year_completed")
      ? Number(formData.get("year_completed"))
      : null,
    square_footage: formData.get("square_footage")
      ? Number(formData.get("square_footage"))
      : null,
    budget_range: String(formData.get("budget_range") || "").trim() || null,
    meta_description: String(formData.get("meta_description") || "").trim() || null,
    display_order: Number(formData.get("display_order") || 0),
    featured: formData.get("featured") === "on",
  };

  if (status !== "draft" && !existing?.published_at) {
    payload.published_at = new Date().toISOString();
  }

  await supabase.from("projects").update(payload).eq("id", id);
  revalidate(id, slug);
}

export async function deleteProjectImage(formData: FormData) {
  const { supabase } = await requireAdmin();
  const imageId = String(formData.get("image_id"));
  const projectId = String(formData.get("project_id"));
  await supabase.from("project_images").delete().eq("id", imageId);
  revalidate(projectId);
}

export async function addProjectImage(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const publicUrl = String(formData.get("public_url")).trim();
  if (!publicUrl) return;

  const storagePath = publicUrl.split("/project-images/").pop() || publicUrl;
  await supabase.from("project_images").insert({
    project_id: projectId,
    storage_path: storagePath,
    public_url: publicUrl,
    caption: String(formData.get("caption") || "").trim() || null,
    alt_text: String(formData.get("alt_text") || "").trim() || null,
    is_hero: formData.get("is_hero") === "on",
    visibility: "public",
  });
  revalidate(projectId);
}
