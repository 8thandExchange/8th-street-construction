import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setProfilePortalActive, setUserProjectPortalAccess } from "@/lib/actions/portal-access-control";
import { PortalAccessToggle } from "@/components/portal/PortalAccessToggle";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pre_construction: "Pre-Construction",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
  archived: "Archived",
};

export default async function UserPortalAccessPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, first_name, last_name, organization_name, portal_active")
    .eq("id", id)
    .single();

  if (!profile || profile.role !== "client") notFound();

  const [{ data: projects }, { data: memberRows }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, status, client_id, client_portal_enabled")
      .neq("status", "archived")
      .order("title"),
    supabase
      .from("project_portal_members")
      .select("project_id, portal_enabled")
      .eq("profile_id", id),
  ]);

  const memberMap = new Map(
    (memberRows ?? []).map((m) => [m.project_id, m.portal_enabled])
  );

  const displayName =
    profile.organization_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.email;

  return (
    <div className="p-8 md:p-12 max-w-3xl">
      <Link
        href="/admin/users"
        className="text-xs font-mono tracking-[0.18em] uppercase text-stone-300 hover:text-ink"
      >
        ← Portal Users
      </Link>

      <h1 className="mt-4 font-display text-display-md text-ink">{displayName}</h1>
      <p className="mt-2 text-sm text-ink/55 font-mono">{profile.email}</p>

      <form action={setProfilePortalActive} className="mt-8 dash-panel p-6">
        <input type="hidden" name="profile_id" value={profile.id} />
        <PortalAccessToggle
          name="portal_active"
          defaultChecked={profile.portal_active}
          label="Portal account active"
          description="Master switch. When off, this user cannot sign into the client portal at all."
        />
        <button
          type="submit"
          className="mt-4 inline-flex h-10 items-center px-5 bg-ink text-bone font-mono text-[10px] uppercase tracking-wider hover:bg-copper transition-colors"
        >
          Save account access
        </button>
      </form>

      <section className="mt-10">
        <h2 className="eyebrow mb-2">Project access</h2>
        <p className="text-sm text-ink/55 mb-6 max-w-xl">
          Toggle which projects this client can see. Primary client assignments and additional
          viewer grants are both controlled here.
        </p>

        {!profile.portal_active && (
          <div className="mb-6 p-4 border border-amber-200 bg-amber-50 text-sm text-amber-900">
            Account is suspended — project toggles won&apos;t matter until portal account is active
            again.
          </div>
        )}

        <ul className="space-y-2">
          {(projects ?? []).map((p) => {
            const isPrimary = p.client_id === profile.id;
            const isMember = memberMap.has(p.id);
            const enabled = isPrimary
              ? Boolean(p.client_portal_enabled)
              : Boolean(memberMap.get(p.id));

            if (!isPrimary && !isMember) {
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 border border-ink/10 bg-paper/50 opacity-60"
                >
                  <div>
                    <p className="font-medium text-ink">{p.title}</p>
                    <p className="text-[10px] font-mono uppercase text-stone-300 mt-1">
                      {STATUS_LABELS[p.status] ?? p.status} · No access
                    </p>
                  </div>
                  <form action={setUserProjectPortalAccess}>
                    <input type="hidden" name="project_id" value={p.id} />
                    <input type="hidden" name="profile_id" value={profile.id} />
                    <input type="hidden" name="portal_enabled" value="true" />
                    <button
                      type="submit"
                      className="font-mono text-[10px] uppercase text-copper hover:underline"
                    >
                      Grant access →
                    </button>
                  </form>
                </li>
              );
            }

            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-4 p-4 border border-ink/10 bg-paper"
              >
                <div>
                  <Link
                    href={`/admin/projects/${p.id}`}
                    className="font-medium text-ink hover:text-copper"
                  >
                    {p.title}
                  </Link>
                  <p className="text-[10px] font-mono uppercase text-stone-300 mt-1">
                    {STATUS_LABELS[p.status] ?? p.status}
                    {isPrimary ? " · Primary client" : " · Additional viewer"}
                  </p>
                </div>
                <form action={setUserProjectPortalAccess} className="flex items-center gap-3">
                  <input type="hidden" name="project_id" value={p.id} />
                  <input type="hidden" name="profile_id" value={profile.id} />
                  <PortalAccessToggle
                    name="portal_enabled"
                    defaultChecked={enabled}
                    label=""
                    disabled={!profile.portal_active}
                  />
                  <button
                    type="submit"
                    className="font-mono text-[10px] uppercase text-copper hover:underline"
                  >
                    Save
                  </button>
                </form>
              </li>
            );
          })}
        </ul>

        {(projects ?? []).length === 0 && (
          <p className="text-sm text-ink/45 italic">No active projects in the system yet.</p>
        )}
      </section>
    </div>
  );
}
