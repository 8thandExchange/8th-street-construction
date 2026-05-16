import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ProjectFormFields } from "@/components/admin/ProjectFormFields";
import Link from "next/link";

async function createProject(formData: FormData) {
  "use server";
  const supabase = await createClient();

  const payload = {
    slug: String(formData.get("slug")).trim().toLowerCase(),
    title: String(formData.get("title")).trim(),
    subtitle: String(formData.get("subtitle") || "").trim() || null,
    category: String(formData.get("category")),
    status: String(formData.get("status")),
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
    published_at:
      String(formData.get("status")) !== "draft" ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("projects")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/projects");
  revalidatePath("/projects");
  revalidatePath("/");
  redirect(`/admin/projects/${data.id}`);
}

export default function NewProjectPage() {
  return (
    <div className="p-8 md:p-12 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/admin/projects"
          className="text-xs font-mono tracking-[0.18em] uppercase text-stone-300 hover:text-ink"
        >
          ← All Projects
        </Link>
      </div>
      <div className="mb-10">
        <span className="eyebrow">— New Project</span>
        <h1 className="mt-2 font-display text-display-md text-ink">Create Project</h1>
      </div>

      <form action={createProject} className="bg-paper border border-ink/15 p-8 md:p-12">
        <ProjectFormFields />
        <div className="mt-10 pt-6 border-t border-ink/15 flex gap-3">
          <button
            type="submit"
            className="inline-flex h-12 items-center px-6 bg-ink text-bone hover:bg-copper font-mono text-[11px] tracking-[0.2em] uppercase transition-colors duration-500"
          >
            Create Project
          </button>
          <Link
            href="/admin/projects"
            className="inline-flex h-12 items-center px-6 border border-ink/30 text-ink hover:bg-ink hover:text-bone font-mono text-[11px] tracking-[0.2em] uppercase transition-colors duration-500"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
