import Link from "next/link";
import { ProjectFormFields } from "@/components/admin/ProjectFormFields";
import { createProjectWithPlaybook } from "@/lib/actions/project-create";

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
        <span className="eyebrow">— New Job</span>
        <h1 className="mt-2 font-display text-display-md text-ink">Start a Build</h1>
        <p className="mt-3 text-ink/65 max-w-xl">
          Creates the project and optionally seeds the Georgia residential playbook — 11 phases,
          70+ checklist items from pre-construction through warranty.
        </p>
      </div>

      <form
        action={createProjectWithPlaybook}
        className="bg-paper border border-ink/15 p-8 md:p-12 space-y-8"
      >
        <ProjectFormFields defaults={{ status: "pre_construction", category: "custom_home" }} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-ink/15">
          <div>
            <label className="field-label">Street address</label>
            <input name="street_address" className="field-input" placeholder="608 Macon Ave" />
          </div>
          <div>
            <label className="field-label">Jurisdiction</label>
            <input
              name="jurisdiction"
              className="field-input"
              placeholder="City of Augusta, Richmond County, GA"
            />
          </div>
          <div>
            <label className="field-label">Start date</label>
            <input type="date" name="start_date" className="field-input" />
          </div>
          <div>
            <label className="field-label">Target completion</label>
            <input type="date" name="target_completion_date" className="field-input" />
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer border border-copper/30 bg-copper/5 p-5">
          <input
            type="checkbox"
            name="apply_playbook"
            defaultChecked
            className="w-5 h-5 accent-copper mt-0.5"
          />
          <span>
            <span className="text-sm font-medium text-ink block">
              Apply Georgia Custom Residential playbook
            </span>
            <span className="text-xs text-ink/60 mt-1 block leading-relaxed">
              Seeds milestones + internal checklists (permits, inspections, termite pretreat,
              lien waivers, CO, warranty walks).
            </span>
          </span>
        </label>

        <div className="pt-6 border-t border-ink/15 flex gap-3">
          <button
            type="submit"
            className="inline-flex h-12 items-center px-6 bg-ink text-bone hover:bg-copper font-mono text-[11px] tracking-[0.2em] uppercase transition-colors"
          >
            Create & Open Build System
          </button>
          <Link
            href="/admin/projects"
            className="inline-flex h-12 items-center px-6 border border-ink/30 font-mono text-[11px] tracking-[0.2em] uppercase"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
