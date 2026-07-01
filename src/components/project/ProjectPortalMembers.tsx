import { addProjectPortalMember, removeProjectPortalMember } from "@/lib/actions/portal-access-control";
import { setUserProjectPortalAccess } from "@/lib/actions/portal-access-control";
import { PortalAccessToggle } from "@/components/portal/PortalAccessToggle";

type Member = {
  profile_id: string;
  portal_enabled: boolean;
  email: string;
  first_name: string | null;
  last_name: string | null;
  organization_name: string | null;
};

type ProjectPortalMembersProps = {
  projectId: string;
  primaryClientId: string | null;
  members: Member[];
  availableClients: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    organization_name: string | null;
  }[];
};

function label(c: { email: string; first_name: string | null; last_name: string | null; organization_name: string | null }) {
  return (
    c.organization_name ||
    [c.first_name, c.last_name].filter(Boolean).join(" ") ||
    c.email
  );
}

export function ProjectPortalMembers({
  projectId,
  primaryClientId,
  members,
  availableClients,
}: ProjectPortalMembersProps) {
  const addable = availableClients.filter(
    (c) => c.id !== primaryClientId && !members.some((m) => m.profile_id === c.id)
  );

  if (!primaryClientId && members.length === 0 && addable.length === 0) return null;

  return (
    <div className="mt-8 pt-8 border-t border-bone/10">
      <h3 className="font-display text-lg text-bone mb-1">Additional portal viewers</h3>
      <p className="text-xs text-bone/45 mb-6 max-w-lg">
        Grant other client accounts access to this project — co-homeowners, Habitat staff, etc.
        Each person gets their own toggle.
      </p>

      {members.length > 0 && (
        <ul className="space-y-2 mb-6">
          {members.map((m) => (
            <li
              key={m.profile_id}
              className="flex flex-wrap items-center justify-between gap-3 p-4 border border-bone/10 bg-ink/20"
            >
              <div>
                <p className="text-sm text-bone font-medium">{label(m)}</p>
                <p className="text-[10px] font-mono text-bone/40">{m.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <form action={setUserProjectPortalAccess}>
                  <input type="hidden" name="project_id" value={projectId} />
                  <input type="hidden" name="profile_id" value={m.profile_id} />
                  <PortalAccessToggle
                    name="portal_enabled"
                    defaultChecked={m.portal_enabled}
                    label=""
                  />
                  <button
                    type="submit"
                    className="ml-2 font-mono text-[9px] uppercase text-amber-400/80 hover:underline"
                  >
                    Save
                  </button>
                </form>
                <form action={removeProjectPortalMember}>
                  <input type="hidden" name="project_id" value={projectId} />
                  <input type="hidden" name="profile_id" value={m.profile_id} />
                  <button
                    type="submit"
                    className="font-mono text-[9px] uppercase text-bone/40 hover:text-red-400"
                  >
                    Remove
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {addable.length > 0 && (
        <form action={addProjectPortalMember} className="flex flex-wrap gap-3 items-end">
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="portal_enabled" value="true" />
          <div className="flex-1 min-w-[200px]">
            <label className="field-label text-bone/60">Add viewer</label>
            <select
              name="profile_id"
              required
              className="field-input mt-2 bg-ink/40 border-bone/15 text-bone"
            >
              <option value="">— Select client account —</option>
              {addable.map((c) => (
                <option key={c.id} value={c.id}>
                  {label(c)} · {c.email}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="funding-save-btn h-11">
            Add & enable
          </button>
        </form>
      )}
    </div>
  );
}
