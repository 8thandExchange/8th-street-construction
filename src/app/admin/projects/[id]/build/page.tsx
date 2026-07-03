import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { applyResidentialPlaybook } from "@/lib/actions/playbook";
import { getPlaybookProgress } from "@/lib/build/apply-playbook";
import { getPlaybookById, listPlaybooks, DEFAULT_PLAYBOOK_ID } from "@/lib/build/playbook-registry";
import { PlaybookSelect } from "@/components/admin/PlaybookSelect";

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
        <p className="mt-3 text-ink/65 leading-relaxed max-w-2xl">
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
            <button
              type="submit"
              className="app-btn app-btn-accent !h-10 !px-5"
            >
              Apply Playbook to This Project
            </button>
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
            <div className="p-6 border border-ink/15 bg-paper">
              <div className="eyebrow">Overall</div>
              <div className="app-h1 mt-2">{overallPct}%</div>
              <div className="text-xs font-mono text-stone-300 mt-1">
                {doneTasks}/{totalTasks} tasks
              </div>
            </div>
            <div className="p-6 border border-ink/15 bg-paper">
              <div className="eyebrow">Playbook</div>
              <div className="text-sm text-ink mt-2 font-medium">{activePlaybook.name}</div>
              <div className="text-xs font-mono text-stone-300 mt-1">{activePlaybook.state}</div>
            </div>
            <div className="p-6 border border-ink/15 bg-paper md:col-span-2">
              <div className="eyebrow">Site</div>
              <div className="text-sm text-ink mt-2">
                {project.street_address || project.location || "—"}
              </div>
              {project.jurisdiction && (
                <div className="text-xs font-mono text-stone-300 mt-1">{project.jurisdiction}</div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-8">
            <Link
              href={`/admin/projects/${id}/tasks`}
              className="inline-flex h-11 items-center px-5 app-btn app-btn-primary"
            >
              Open Checklists →
            </Link>
            <Link
              href={`/admin/projects/${id}/daily-logs`}
              className="inline-flex h-11 items-center px-5 app-btn app-btn-secondary"
            >
              Daily Logs
            </Link>
            <Link
              href={`/admin/projects/${id}/milestones`}
              className="inline-flex h-11 items-center px-5 app-btn app-btn-secondary"
            >
              Client Timeline
            </Link>
          </div>

          <h3 className="eyebrow mb-4">Phase progress</h3>
          <div className="space-y-3 mb-10">
            {progress.map((p) => (
              <div key={p.phaseKey} className="p-5 border border-ink/15 bg-paper">
                <div className="flex justify-between gap-4 mb-2">
                  <div>
                    <div className="font-medium text-ink">{p.title}</div>
                    <div className="text-xs text-ink/55 mt-1">{p.clientSummary}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs text-stone-300">
                      {p.tasksDone}/{p.tasksTotal}
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-stone-300 mt-0.5">
                      {p.milestoneStatus.replace("_", " ")}
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

          <details className="border border-ink/15 p-6 bg-paper text-sm">
            <summary className="cursor-pointer font-mono text-[10px] tracking-[0.15em] uppercase text-stone-300">
              Re-apply playbook (replaces milestones & tasks)
            </summary>
            <form action={applyResidentialPlaybook} className="mt-6 space-y-4 max-w-md">
              <input type="hidden" name="project_id" value={id} />
              <input type="hidden" name="replace" value="on" />
              <PlaybookSelect defaultValue={project.playbook_id ?? DEFAULT_PLAYBOOK_ID} />
              <p className="text-ink/60">
                Warning: this deletes existing milestones and tasks for this project and re-seeds
                from the selected template.
              </p>
              <button
                type="submit"
                className="h-10 px-4 border border-red-300 text-red-700 font-mono text-[10px] uppercase"
              >
                Reset & Re-apply
              </button>
            </form>
          </details>
        </>
      )}
    </div>
  );
}
