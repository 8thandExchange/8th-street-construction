"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { uniqueProjectSlug, normalizeCategory } from "@/lib/project/create";

export async function convertConsultationToProject(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));

  const { data: consult } = await supabase
    .from("consultations")
    .select("*")
    .eq("id", id)
    .single();
  if (!consult) throw new Error("Consultation not found");

  const name = [consult.first_name, consult.last_name].filter(Boolean).join(" ").trim();
  const title = name || consult.email || "New Project";
  const slug = await uniqueProjectSlug(supabase, title);

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      slug,
      title,
      category: normalizeCategory(consult.project_type),
      status: "pre_construction",
      location: consult.project_location || null,
      narrative: consult.notes || null,
      excerpt: consult.notes ? String(consult.notes).slice(0, 280) : null,
      published_at: null,
    })
    .select("id")
    .single();

  if (error || !project) {
    throw new Error(error?.message ?? "Could not create project from consultation");
  }

  await supabase
    .from("consultations")
    .update({ status: "completed" })
    .eq("id", id);

  revalidatePath("/admin/consultations");
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  redirect(`/admin/projects/${project.id}`);
}
