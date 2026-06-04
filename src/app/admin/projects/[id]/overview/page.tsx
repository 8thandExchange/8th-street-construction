import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ProjectFormFields } from "@/components/admin/ProjectFormFields";
import Image from "next/image";
import {
  updateProject,
  deleteProjectImage,
  addProjectImage,
} from "@/lib/actions/project-overview";

export const dynamic = "force-dynamic";

export default async function ProjectOverviewPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!project) notFound();

  const { data: images } = await supabase
    .from("project_images")
    .select("*")
    .eq("project_id", project.id)
    .order("display_order", { ascending: true });

  return (
    <div className="max-w-4xl">
      <form
        action={async (fd) => {
          await updateProject(fd);
        }}
        className="bg-paper border border-ink/15 p-8 md:p-12 mb-10"
      >
        <input type="hidden" name="id" value={project.id} />
        <span className="eyebrow">— Project Details</span>
        <div className="mt-6">
          <ProjectFormFields defaults={project} />
        </div>
        <div className="mt-10 pt-6 border-t border-ink/15">
          <button
            type="submit"
            className="inline-flex h-12 items-center px-6 bg-ink text-bone hover:bg-copper font-mono text-[11px] tracking-[0.2em] uppercase transition-colors"
          >
            Save Changes
          </button>
        </div>
      </form>

      <div className="bg-paper border border-ink/15 p-8 md:p-12">
        <h2 className="font-display text-2xl text-ink mb-2">Gallery Images</h2>
        <p className="text-sm text-stone-300 mb-8">
          Upload to the <code className="font-mono text-xs">project-images</code> bucket, then
          paste the public URL — or use the uploader on a future pass.
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
                <form
                  action={async (fd) => {
                    await deleteProjectImage(fd);
                  }}
                  className="mt-2"
                >
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

        <form
          action={async (fd) => {
            await addProjectImage(fd);
          }}
          className="border-t border-ink/15 pt-8 flex flex-col gap-5"
        >
          <input type="hidden" name="project_id" value={project.id} />
          <h3 className="eyebrow">Add Image</h3>
          <div>
            <label className="field-label">Public URL *</label>
            <input name="public_url" required className="field-input" placeholder="https://..." />
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
            className="self-start inline-flex h-11 items-center px-5 bg-ink text-bone hover:bg-copper font-mono text-[11px] tracking-[0.2em] uppercase transition-colors"
          >
            + Add Image
          </button>
        </form>
      </div>
    </div>
  );
}
