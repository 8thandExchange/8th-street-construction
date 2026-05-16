import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ProjectFormFields } from "@/components/admin/ProjectFormFields";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

async function updateProject(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));

  const existing = await supabase
    .from("projects")
    .select("status, published_at")
    .eq("id", id)
    .single();

  const payload: Record<string, unknown> = {
    slug: String(formData.get("slug")).trim().toLowerCase(),
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

  // Set published_at the first time it transitions out of draft
  if (status !== "draft" && !existing.data?.published_at) {
    payload.published_at = new Date().toISOString();
  }

  await supabase.from("projects").update(payload).eq("id", id);
  revalidatePath(`/admin/projects/${id}`);
  revalidatePath("/admin/projects");
  revalidatePath("/projects");
  revalidatePath("/");
  revalidatePath(`/projects/${payload.slug}`);
}

async function deleteImage(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const imageId = String(formData.get("image_id"));
  const projectId = String(formData.get("project_id"));
  await supabase.from("project_images").delete().eq("id", imageId);
  revalidatePath(`/admin/projects/${projectId}`);
}

async function addImage(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const projectId = String(formData.get("project_id"));
  const publicUrl = String(formData.get("public_url")).trim();
  const caption = String(formData.get("caption") || "").trim() || null;
  const altText = String(formData.get("alt_text") || "").trim() || null;
  const isHero = formData.get("is_hero") === "on";

  if (!publicUrl) return;

  // Extract storage path from public URL (best effort)
  const storagePath = publicUrl.split("/project-images/").pop() || publicUrl;

  await supabase.from("project_images").insert({
    project_id: projectId,
    storage_path: storagePath,
    public_url: publicUrl,
    caption,
    alt_text: altText,
    is_hero: isHero,
    visibility: "public",
  });

  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/projects");
}

export default async function EditProjectPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!project) notFound();

  const { data: images } = await supabase
    .from("project_images")
    .select("*")
    .eq("project_id", project.id)
    .order("display_order", { ascending: true });

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

      <div className="flex items-start justify-between gap-6 mb-10">
        <div>
          <span className="eyebrow">— Edit Project</span>
          <h1 className="mt-2 font-display text-display-md text-ink">{project.title}</h1>
        </div>
        {project.status !== "draft" && (
          <Link
            href={`/projects/${project.slug}`}
            target="_blank"
            className="inline-flex h-10 items-center px-4 border border-ink/30 text-ink hover:bg-ink hover:text-bone font-mono text-[11px] tracking-[0.2em] uppercase transition-colors"
          >
            View Live ↗
          </Link>
        )}
      </div>

      {/* Edit form */}
      <form action={updateProject} className="bg-paper border border-ink/15 p-8 md:p-12 mb-10">
        <input type="hidden" name="id" value={project.id} />
        <ProjectFormFields defaults={project} />
        <div className="mt-10 pt-6 border-t border-ink/15 flex gap-3">
          <button
            type="submit"
            className="inline-flex h-12 items-center px-6 bg-ink text-bone hover:bg-copper font-mono text-[11px] tracking-[0.2em] uppercase transition-colors duration-500"
          >
            Save Changes
          </button>
        </div>
      </form>

      {/* Images section */}
      <div className="bg-paper border border-ink/15 p-8 md:p-12">
        <h2 className="font-display text-2xl text-ink mb-2">Gallery Images</h2>
        <p className="text-sm text-stone-300 mb-8">
          Upload images to the <code className="font-mono text-xs">project-images</code> bucket in Supabase Storage, then paste the public URL here.
        </p>

        {images && images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
            {images.map((img) => (
              <div key={img.id} className="relative group">
                <div className="aspect-[4/5] bg-bone relative overflow-hidden">
                  <Image
                    src={img.public_url}
                    alt={img.alt_text || ""}
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                  {img.is_hero && (
                    <div className="absolute top-2 left-2 bg-copper text-bone text-[9px] font-mono tracking-[0.15em] uppercase px-2 py-1">
                      Hero
                    </div>
                  )}
                </div>
                {img.caption && (
                  <div className="text-xs text-stone-300 mt-2 line-clamp-2">{img.caption}</div>
                )}
                <form action={deleteImage} className="mt-2">
                  <input type="hidden" name="image_id" value={img.id} />
                  <input type="hidden" name="project_id" value={project.id} />
                  <button
                    type="submit"
                    className="text-[10px] font-mono tracking-[0.15em] uppercase text-stone-300 hover:text-copper"
                  >
                    Remove ×
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <form action={addImage} className="border-t border-ink/15 pt-8 flex flex-col gap-5">
          <input type="hidden" name="project_id" value={project.id} />
          <h3 className="eyebrow">Add Image</h3>
          <div>
            <label className="field-label">Public URL *</label>
            <input
              name="public_url"
              required
              className="field-input"
              placeholder="https://...supabase.co/storage/v1/object/public/project-images/..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="field-label">Caption</label>
              <input name="caption" className="field-input" />
            </div>
            <div>
              <label className="field-label">Alt Text</label>
              <input name="alt_text" className="field-input" />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="is_hero" className="w-5 h-5 accent-copper" />
            <span className="text-sm text-ink">Use as hero image</span>
          </label>
          <button
            type="submit"
            className="self-start inline-flex h-11 items-center px-5 bg-ink text-bone hover:bg-copper font-mono text-[11px] tracking-[0.2em] uppercase transition-colors duration-500"
          >
            + Add Image
          </button>
        </form>
      </div>
    </div>
  );
}
