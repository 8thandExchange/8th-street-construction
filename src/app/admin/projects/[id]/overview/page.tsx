import { redirect } from "next/navigation";
import { ProjectFormFields } from "@/components/admin/ProjectFormFields";
import Image from "next/image";
import {
  updateProject,
  deleteProjectImage,
  addProjectImage,
} from "@/lib/actions/project-overview";
import { listJurisdictions } from "@/lib/building-regulations/registry";
import { ClientAssignmentPanel } from "@/components/project/ClientAssignmentPanel";
import { updateProjectPortalFeatures } from "@/lib/actions/portal-access-control";
import { PORTAL_FEATURES, isFeatureEnabled } from "@/lib/portal/features";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { assignJobOwners } from "@/lib/actions/staff-access";

export const dynamic = "force-dynamic";

export default async function ProjectOverviewPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!project) redirect("/admin/projects");

  const { data: clients } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, organization_name, organization_slug")
    .eq("role", "client")
    .order("email");

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, staff_scope")
    .eq("role", "admin")
    .order("first_name");
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  const viewerRow = (staff ?? []).find((person) => person.id === viewer?.id);
  const canAssignOwners = (viewerRow?.staff_scope ?? "full") === "full";

  const { data: images } = await supabase
    .from("project_images")
    .select("*")
    .eq("project_id", project.id)
    .order("display_order", { ascending: true });

  const jurisdictions = listJurisdictions();

  const { data: basePlans } = await supabase
    .from("house_base_plans")
    .select("id, plan_number, name, variant")
    .eq("active", true)
    .order("display_order");

  const { data: memberRows } = await supabase
    .from("project_portal_members")
    .select(
      "profile_id, portal_enabled, profiles:profile_id(email, first_name, last_name, organization_name)"
    )
    .eq("project_id", project.id);

  const portalMembers = (memberRows ?? []).map((row) => {
    const raw = row.profiles;
    const p = (Array.isArray(raw) ? raw[0] : raw) as {
      email: string;
      first_name: string | null;
      last_name: string | null;
      organization_name: string | null;
    } | null;
    return {
      profile_id: row.profile_id,
      portal_enabled: row.portal_enabled,
      email: p?.email ?? "",
      first_name: p?.first_name ?? null,
      last_name: p?.last_name ?? null,
      organization_name: p?.organization_name ?? null,
    };
  });

  return (
    <div className="max-w-4xl">
      {canAssignOwners && (
      <form action={assignJobOwners} className="app-card p-6 md:p-8 mb-10">
        <input type="hidden" name="project_id" value={project.id} />
        <h3 className="app-label mb-1">Job owners</h3>
        <p className="text-sm app-muted mb-4">
          A project manager sees this job in their list. A superintendent sees the
          field tabs only.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="project_manager_id">
              Project manager
            </label>
            <select
              id="project_manager_id"
              name="project_manager_id"
              className="field-input"
              defaultValue={project.project_manager_id ?? ""}
            >
              <option value="">— unassigned —</option>
              {(staff ?? []).map((person) => (
                <option key={person.id} value={person.id}>
                  {[person.first_name, person.last_name].filter(Boolean).join(" ") || person.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="superintendent_id">
              Superintendent
            </label>
            <select
              id="superintendent_id"
              name="superintendent_id"
              className="field-input"
              defaultValue={project.superintendent_id ?? ""}
            >
              <option value="">— unassigned —</option>
              {(staff ?? []).map((person) => (
                <option key={person.id} value={person.id}>
                  {[person.first_name, person.last_name].filter(Boolean).join(" ") || person.email}
                </option>
              ))}
            </select>
          </div>
        </div>
        <SubmitButton className="mt-5 app-btn app-btn-secondary">Save owners</SubmitButton>
      </form>
      )}

      <ClientAssignmentPanel
        projectId={project.id}
        clientId={project.client_id}
        clientPortalEnabled={Boolean(project.client_portal_enabled)}
        fundingType={project.funding_type ?? "private"}
        hudGrantYear={project.hud_grant_year}
        hudProgramNotes={project.hud_program_notes}
        clients={clients ?? []}
        portalMembers={portalMembers}
      />

      <form
        action={async (fd) => {
          "use server";
          await updateProjectPortalFeatures(fd);
        }}
        className="app-card p-6 md:p-8 mb-10"
      >
        <input type="hidden" name="project_id" value={project.id} />
        <h3 className="app-label mb-1">Portal features for this job</h3>
        <p className="text-sm app-muted mb-4">
          Untick anything this client doesn&apos;t need — hidden tabs disappear from their
          portal. Overview and access rules are unaffected.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2.5">
          {PORTAL_FEATURES.map((f) => (
            <label key={f.key} className="flex items-center gap-2.5 text-sm text-ink cursor-pointer">
              <input
                type="checkbox"
                name={`feature_${f.key}`}
                defaultChecked={isFeatureEnabled(project.portal_features, f.key)}
                className="w-4 h-4 accent-copper"
              />
              {f.label}
            </label>
          ))}
        </div>
        <SubmitButton className="mt-5 app-btn app-btn-secondary">
          Save Portal Features
        </SubmitButton>
      </form>

      <form
        action={async (fd) => {
          "use server";
          await updateProject(fd);
        }}
        className="app-card p-4 md:p-8 lg:p-10 mb-10"
      >
        <input type="hidden" name="id" value={project.id} />
        <span className="app-label">— Project Details</span>
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
              placeholder="Street address"
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
            <p className="text-xs app-muted mt-2">
              Drives local building regulations shown on Plans & Renderings.
            </p>
          </div>
          <div>
            <label className="field-label">Subdivision</label>
            <input
              name="subdivision"
              defaultValue={project.subdivision ?? ""}
              className="field-input"
              placeholder="Neighborhood or area"
            />
          </div>
          <div>
            <label className="field-label">Lot number</label>
            <input
              name="lot_number"
              defaultValue={project.lot_number ?? ""}
              className="field-input"
              placeholder="e.g. 12"
            />
          </div>
          <div>
            <label className="field-label">Base house plan</label>
            <select
              name="base_plan_id"
              className="field-input"
              defaultValue={project.base_plan_id ?? ""}
            >
              <option value="">— Select standard plan —</option>
              {(basePlans ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.plan_number} — {p.name}
                  {p.variant ? ` (${p.variant})` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs app-muted mt-2">
              Each lot needs revisions from this base plan against its plat.
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
            <label className="field-label">What the client pays us ($)</label>
            <input
              type="number"
              step="1"
              name="contract_value"
              defaultValue={project.contract_value ?? ""}
              className="field-input"
              placeholder="Agreement amount"
            />
            <p className="text-xs app-muted mt-2">
              Client billing only — our cost plan is on the{" "}
              <a href={`/admin/projects/${project.id}/costs`} className="text-copper hover:underline">
                Cost Plan
              </a>{" "}
              page.
            </p>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-ink/15">
          <SubmitButton>Save Changes</SubmitButton>
        </div>
      </form>

      <div className="app-card p-4 md:p-8 lg:p-10">
        <h2 className="app-h2 mb-2">Gallery Images</h2>
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
                  <button type="submit" className="text-xs text-red-700 hover:underline">
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
          <SubmitButton className="self-start app-btn app-btn-primary">
            + Add Image
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
