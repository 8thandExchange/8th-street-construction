import { redirect } from "next/navigation";
import { ProjectFormFields } from "@/components/admin/ProjectFormFields";
import Link from "next/link";
import Image from "next/image";
import {
  updateProject,
  deleteProjectImage,
  addProjectImage,
} from "@/lib/actions/project-overview";
import { listJurisdictions } from "@/lib/building-regulations/registry";

export const dynamic = "force-dynamic";

export default async function ProjectOverviewPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!project) redirect("/admin/projects");

  const { data: clients } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .eq("role", "client")
    .order("email");

  const { data: images } = await supabase
    .from("project_images")
    .select("*")
    .eq("project_id", project.id)
    .order("display_order", { ascending: true });

  const jurisdictions = listJurisdictions();

  return (
    <div className="max-w-4xl">
      <form
        action={async (fd) => {
          "use server";
          await updateProject(fd);
        }}
        className="bg-paper border border-ink/15 p-8 md:p-12 mb-10"
      >
        <input type="hidden" name="id" value={project.id} />
        <span className="eyebrow">— Project Details</span>
        <div className="mt-6">
          <ProjectFormFields defaults={project} />
        </div>

        <div className="mt-8 pt-8 border-t border-ink/15 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="field-label">Street address</label>
            <input
              name="street_address"
              defaultValue={project.street_address ?? ""}
              className="field-input"
              placeholder="608 Macon Ave"
            />
          </div>
          <div>
            <label className="field-label">Jurisdiction (permits & inspections)</label>
            <select
              name="jurisdiction"
              className="field-input"
              defaultValue={project.jurisdiction ?? jurisdictions[0]?.name ?? ""}
            >
              {jurisdictions.map((j) => (
                <option key={j.key} value={j.name}>
                  {j.name}, {j.state}
                </option>
              ))}
            </select>
            <p className="text-xs text-ink/50 mt-2">
              Drives local building regulations shown on Plans & Renderings.
            </p>
          </div>
          <div>
            <label className="field-label">Start date</label>
            <input
              type="date"
              name="start_date"
              defaultValue={project.start_date?.slice(0, 10) ?? ""}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Target completion</label>
            <input
              type="date"
              name="target_completion_date"
              defaultValue={project.target_completion_date?.slice(0, 10) ?? ""}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Client</label>
            <select name="client_id" className="field-input" defaultValue={project.client_id ?? ""}>
              <option value="">— None —</option>
              {(clients ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Contract value (internal)</label>
            <input
              type="number"
              step="0.01"
              name="contract_value"
              defaultValue={project.contract_value ?? ""}
              className="field-input"
            />
          </div>
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
        {images && images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
            {images.map((img) => (
              <div key={img.id} className="relative">
                <div className="aspect-[4/5] bg-bone relative overflow-hidden">
                  <Image
                    src={img.public_url}
                    alt={img.alt_text || ""}
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                </div>
                <form
                  action={async (fd) => {
                    "use server";
                    await deleteProjectImage(fd);
                  }}
                  className="mt-2"
                >
                  <input type="hidden" name="image_id" value={img.id} />
                  <input type="hidden" name="project_id" value={project.id} />
                  <button type="submit" className="text-[10px] font-mono uppercase text-stone-300">
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
        <form
          action={async (fd) => {
            "use server";
            await addProjectImage(fd);
          }}
          className="border-t border-ink/15 pt-8 flex flex-col gap-5"
        >
          <input type="hidden" name="project_id" value={project.id} />
          <input name="public_url" required className="field-input" placeholder="Image public URL" />
          <button type="submit" className="self-start h-11 px-5 bg-ink text-bone font-mono text-[10px] uppercase">
            + Add Image
          </button>
        </form>
      </div>
    </div>
  );
}
