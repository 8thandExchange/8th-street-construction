"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { applyPlaybookToProject } from "@/lib/build/apply-playbook";
import { DEFAULT_PLAYBOOK_ID } from "@/lib/build/playbook-registry";
import { slugifyProjectTitle } from "@/lib/utils";

export async function createProjectWithPlaybook(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const applyPlaybook = formData.get("apply_playbook") === "on";
  const status = String(formData.get("status"));
  const title = String(formData.get("title")).trim();
  const slugInput = String(formData.get("slug")).trim().toLowerCase();
  const slug = slugInput || slugifyProjectTitle(title);

  if (!slug) {
    throw new Error("Enter a job name so we can create the public project link.");
  }

  const payload = {
    slug,
    title,
    subtitle: String(formData.get("subtitle") || "").trim() || null,
    category: String(formData.get("category")),
    status,
    excerpt: String(formData.get("excerpt") || "").trim() || null,
    narrative: String(formData.get("narrative") || "").trim() || null,
    hero_image_url: String(formData.get("hero_image_url") || "").trim() || null,
    location: String(formData.get("location") || "").trim() || null,
    street_address: String(formData.get("street_address") || "").trim() || null,
    jurisdiction: String(formData.get("jurisdiction") || "").trim() || null,
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
    start_date: String(formData.get("start_date") || "").trim() || null,
    target_completion_date:
      String(formData.get("target_completion_date") || "").trim() || null,
    published_at: status !== "draft" ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase.from("projects").insert(payload).select("id").single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create project");
  }

  if (applyPlaybook) {
    const playbookId =
      String(formData.get("playbook_id") || "").trim() || DEFAULT_PLAYBOOK_ID;
    await applyPlaybookToProject(data.id, playbookId, {
      createdBy: user.id,
    });
  }

  revalidatePath("/admin/projects");
  revalidatePath("/projects");
  revalidatePath("/");
  redirect(`/admin/projects/${data.id}/build`);
}
