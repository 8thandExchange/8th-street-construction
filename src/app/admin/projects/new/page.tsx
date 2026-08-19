import Link from "next/link";
import { ProjectFormFields } from "@/components/admin/ProjectFormFields";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { PlaybookSelect } from "@/components/admin/PlaybookSelect";
import { createProjectWithPlaybook } from "@/lib/actions/project-create";

export default function NewProjectPage() {
  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/admin/projects"
          className="text-[13px] font-medium text-copper hover:underline"
        >
          ← All Projects
        </Link>
      </div>
      <div className="mb-10">
        <span className="app-label">— New Job</span>
        <h1 className="mt-2 app-h1">Start a Build</h1>
        <p className="mt-3 app-muted max-w-xl">
          Creates the project and optionally seeds a state residential playbook — Georgia or South
          Carolina — with 11 phases and 70+ checklist items from pre-construction through warranty.
        </p>
      </div>

      <form
        action={createProjectWithPlaybook}
        className="app-card p-4 md:p-8 lg:p-10 space-y-8"
      >
        <ProjectFormFields
          autoSlugFromTitle
          defaults={{ status: "pre_construction", category: "custom_home" }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-ink/15">
          <div>
            <label className="field-label">Street address</label>
            <input name="street_address" className="field-input" placeholder="Job name or street address" />
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

        <div className="border border-copper/30 bg-copper/5 p-5 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="apply_playbook"
              defaultChecked
              className="w-5 h-5 accent-copper mt-0.5"
            />
            <span>
              <span className="text-sm font-medium text-ink block">
                Apply residential build playbook
              </span>
              <span className="text-xs app-muted mt-1 block leading-relaxed">
                Seeds milestones + internal checklists (permits, inspections, lien waivers, CO,
                warranty walks).
              </span>
            </span>
          </label>
          <div>
            <label className="field-label">Playbook</label>
            <PlaybookSelect />
          </div>
        </div>

        <div className="pt-6 border-t border-ink/15 flex gap-3">
          <SubmitButton>Create & Open Build System</SubmitButton>
          <Link
            href="/admin/projects"
            className="app-btn app-btn-secondary"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
