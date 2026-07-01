import Link from "next/link";
import {
  KNOWN_CLIENT_ORGS,
  parseFundingType,
  type ProjectFundingType,
} from "@/lib/project/funding";
import { ProjectFundingBadge } from "@/components/project/ProjectFundingBadge";
import {
  assignProjectClient,
  assignHabitatHudHome,
  clearProjectClient,
} from "@/lib/actions/project-client";
import { FundingProgramFields } from "@/components/project/FundingProgramFields";
import { PortalAccessToggle } from "@/components/portal/PortalAccessToggle";
import { ProjectPortalMembers } from "@/components/project/ProjectPortalMembers";

type PortalMember = {
  profile_id: string;
  portal_enabled: boolean;
  email: string;
  first_name: string | null;
  last_name: string | null;
  organization_name: string | null;
};

type ClientOption = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  organization_name: string | null;
  organization_slug: string | null;
};

type ClientAssignmentPanelProps = {
  projectId: string;
  clientId: string | null;
  clientPortalEnabled: boolean;
  fundingType: ProjectFundingType | string | null;
  hudGrantYear: number | null;
  hudProgramNotes: string | null;
  clients: ClientOption[];
  portalMembers: PortalMember[];
};


function clientLabel(c: ClientOption): string {
  if (c.organization_name) return c.organization_name;
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return name || c.email;
}

export function ClientAssignmentPanel({
  projectId,
  clientId,
  clientPortalEnabled,
  fundingType,
  hudGrantYear,
  hudProgramNotes,
  clients,
  portalMembers,
}: ClientAssignmentPanelProps) {
  const currentFunding = parseFundingType(fundingType ?? "private");
  const selectedClient = clients.find((c) => c.id === clientId);
  const habitatOrg = KNOWN_CLIENT_ORGS[0];
  const habitatProfile = clients.find(
    (c) => c.email === habitatOrg.email || c.organization_slug === habitatOrg.slug
  );

  return (
    <section className="client-assignment-panel mb-10 overflow-hidden" id="client-funding">
      <div className="client-assignment-header">
        <div>
          <span className="eyebrow text-bone/50">— Client & funding</span>
          <h2 className="mt-2 font-display text-2xl md:text-3xl text-bone">
            Who is this build for?
          </h2>
          <p className="mt-2 text-sm text-bone/55 max-w-xl leading-relaxed">
            Link the portal client and set the funding program. HUD HOME projects follow
            Augusta-Richmond County and DCA CHIP requirements — billing, compliance, and
            visual labels all key off this.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-start">
          <ProjectFundingBadge
            fundingType={currentFunding}
            hudGrantYear={hudGrantYear}
            size="lg"
          />
        </div>
      </div>

      <div className="client-assignment-body">
        {/* Quick assign Habitat */}
        {habitatProfile && (
          <div className="mb-8 p-5 border border-emerald-500/25 bg-emerald-950/20">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-400/90">
                  Primary partner
                </p>
                <p className="mt-1 font-display text-lg text-bone">{habitatOrg.name}</p>
                <p className="text-xs text-bone/50 mt-1">{habitatOrg.email}</p>
              </div>
              <form action={assignHabitatHudHome}>
                <input type="hidden" name="project_id" value={projectId} />
                <button type="submit" className="funding-quick-btn-habitat">
                  Assign Habitat + HUD HOME →
                </button>
              </form>
            </div>
          </div>
        )}

        <form action={assignProjectClient} className="space-y-8">
          <input type="hidden" name="project_id" value={projectId} />

          <div>
            <label className="field-label text-bone/70">Portal client</label>
            <select
              name="client_id"
              defaultValue={clientId ?? ""}
              className="field-input mt-2 bg-ink/40 border-bone/15 text-bone"
            >
              <option value="">— No client linked —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {clientLabel(c)}
                  {c.email !== clientLabel(c) ? ` · ${c.email}` : ""}
                </option>
              ))}
            </select>
            {selectedClient && (
              <p className="mt-2 text-xs text-bone/45">
                {clientPortalEnabled ? (
                  <>
                    Portal is <span className="text-emerald-400">live</span> —{" "}
                    <Link
                      href={`/client/projects/${projectId}`}
                      target="_blank"
                      className="text-amber-400/90 hover:underline"
                    >
                      Preview as client ↗
                    </Link>
                  </>
                ) : (
                  <span className="text-amber-400/90">
                    Portal access is off — client cannot see this project yet.
                  </span>
                )}
              </p>
            )}
          </div>

          {clientId && (
            <PortalAccessToggle
              name="client_portal_enabled"
              defaultChecked={clientPortalEnabled}
              label="Portal access live"
              description="When on, the primary client sees this project in their portal. Turn off to pause without unlinking."
            />
          )}

          <FundingProgramFields
            initialFunding={currentFunding}
            hudGrantYear={hudGrantYear}
            hudProgramNotes={hudProgramNotes}
          />

          <div className="flex flex-wrap gap-3 pt-4 border-t border-bone/10">
            <button type="submit" className="funding-save-btn">
              Save client & funding
            </button>
            {clientId && (
              <form action={clearProjectClient} className="inline">
                <input type="hidden" name="project_id" value={projectId} />
                <button type="submit" className="funding-clear-btn">
                  Clear assignment
                </button>
              </form>
            )}
            <Link
              href="/admin/users"
              className="inline-flex h-11 items-center px-4 font-mono text-[10px] uppercase text-bone/50 hover:text-bone"
            >
              Manage portal users →
            </Link>
          </div>
        </form>

        <ProjectPortalMembers
          projectId={projectId}
          primaryClientId={clientId}
          members={portalMembers}
          availableClients={clients}
        />
      </div>
    </section>
  );
}
