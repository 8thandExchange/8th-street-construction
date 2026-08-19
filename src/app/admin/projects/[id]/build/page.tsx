import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { applyResidentialPlaybook } from "@/lib/actions/playbook";
import { getPlaybookProgress } from "@/lib/build/apply-playbook";
import { getPlaybookById, listPlaybooks, DEFAULT_PLAYBOOK_ID } from "@/lib/build/playbook-registry";
import { PlaybookSelect } from "@/components/admin/PlaybookSelect";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { appStatusBadge } from "@/lib/project/status-badges";

export const dynamic = "force-dynamic";

export default async function ProjectBuildSystemPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, title, street_address, location, jurisdiction, playbook_id, playbook_applied_at, status, start_date, target_completion_date"
    )
    .eq("id", id)
    .single();

  if (!project) notFound();

  const [{ data: milestones }, { data: tasks }] = await Promise.all([
    supabase.from("project_milestones").select("phase_key, status").eq("project_id", id),
    supabase.from("project_tasks").select("phase_key, status").eq("project_id", id),
  ]);

  const applied = Boolean(project.playbook_applied_at);
  const activePlaybook =
    getPlaybookById(project.playbook_id ?? DEFAULT_PLAYBOOK_ID) ??
    getPlaybookById(DEFAULT_PLAYBOOK_ID)!;

  const progress = applied
    ? getPlaybookProgress(milestones ?? [], tasks ?? [], activePlaybook)
    : [];

  const totalTasks = (tasks ?? []).length;
  const doneTasks = (tasks ?? []).filter((t) => t.status === "done").length;
  const overallPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const playbooks = listPlaybooks();

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h2 className="app-h1 !text-[18px]">Build System</h2>
        <p className="mt-3 app-muted leading-relaxed max-w-2xl">
          {activePlaybook.description}
        </p>
      </div>

      {!applied ? (
        <div className="rounded-[10px] bg-navy text-bone p-6 md:p-8 mb-8 shadow-md">
          <span className="eyebrow-copper">— Get started</span>
          <h3 className="mt-4 app-h2 !text-[16px]">Apply a state residential playbook</h3>
          <p className="mt-3 text-bone/70 text-sm leading-relaxed max-w-xl">
            Georgia and South Carolina each have a full pre-con → warranty sequence — permits,
            inspections, lien waivers, CO, and closeout — so every home runs the same proven
            process for that state.
          </p>
          <form action={applyResidentialPlaybook} className="mt-8 space-y-6 max-w-md">
            <input type="hidden" name="project_id" value={id} />
            <div>
              <label className="block text-xs font-mono tracking-[0.15em] uppercase text-bone/50 mb-2">
                Playbook
              </label>
              <PlaybookSelect
                className="w-full !bg-bone/10 !border-bone/25 !text-bone rounded-[7px] px-3 py-2.5 text-sm"
              />
            </div>
            <SubmitButton className="app-btn app-btn-accent !h-10 !px-5">
              Apply Playbook to This Project
            </SubmitButton>
          </form>
          <ul className="mt-8 space-y-2 text-xs text-bone/55">
            {playbooks.map((p) => (
              <li key={p.id}>
                <span className="text-copper-100">{p.state}</span> — {p.phaseCount} phases,{" "}
                {p.taskCount} checklist items
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="app-card p-6">
              <div className="app-label">Overall</div>
              <div className="app-h1 mt-2">{overallPct}%</div>
              <div className="text-xs app-muted mt-1">
                {doneTasks}/{totalTasks} tasks
              </div>
            </div>
            <div className="app-card p-6">
              <div className="app-label">Playbook</div>
              <div className="text-sm text-ink mt-2 font-medium">{activePlaybook.name}</div>
              <div className="text-xs app-muted mt-1">{activePlaybook.state}</div>
            </div>
            <div className="app-card p-6 md:col-span-2">
              <div className="app-label">Site</div>
              <div className="text-sm text-ink mt-2">
                {project.street_address || project.location || "—"}
              </div>
              {project.jurisdiction && (
                <div className="text-xs app-muted mt-1">{project.jurisdiction}</div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-8">
            <Link
              href={`/admin/projects/${id}/tasks`}
              className="app-btn app-btn-primary"
            >
              Open Checklists →
            </Link>
            <Link
              href={`/admin/projects/${id}/daily-logs`}
              className="app-btn app-btn-secondary"
            >
              Daily Logs
            </Link>
            <Link
              href={`/admin/projects/${id}/milestones`}
              className="app-btn app-btn-secondary"
            >
              Client Timeline
            </Link>
          </div>

          <h3 className="app-label mb-4">Phase progress</h3>
          <div className="space-y-3 mb-10">
            {progress.map((p) => (
              <div key={p.phaseKey} className="app-card p-5">
                <div className="flex justify-between gap-4 mb-2">
                  <div>
                    <div className="font-medium text-ink">{p.title}</div>
                    <div className="text-xs app-muted mt-1">{p.clientSummary}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs app-muted">
                      {p.tasksDone}/{p.tasksTotal}
                    </div>
                    <div className="mt-1">
                      <span className={appStatusBadge("milestone", p.milestoneStatus)}>
                        {p.milestoneStatus.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="h-1.5 bg-bone overflow-hidden">
                  <div
                    className="h-full bg-copper transition-all"
                    style={{ width: `${p.tasksPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <details className="app-card p-6 text-sm">
            <summary className="cursor-pointer text-[13px] font-medium text-copper hover:underline">
              Re-apply playbook (replaces milestones & tasks)
            </summary>
            <form action={applyResidentialPlaybook} className="mt-6 space-y-4 max-w-md">
              <input type="hidden" name="project_id" value={id} />
              <input type="hidden" name="replace" value="on" />
              <PlaybookSelect defaultValue={project.playbook_id ?? DEFAULT_PLAYBOOK_ID} />
              <p className="app-muted">
                Warning: this deletes existing milestones and tasks for this project and re-seeds
                from the selected template.
              </p>
              <button type="submit" className="text-xs text-red-700 hover:underline">
                Reset & Re-apply
              </button>
            </form>
          </details>
        </>
      )}
    </div>
  );
}
