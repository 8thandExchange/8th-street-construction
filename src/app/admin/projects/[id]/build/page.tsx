import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { applyGeorgiaPlaybook } from "@/lib/actions/playbook";
import { getPlaybookProgress } from "@/lib/build/apply-playbook";
import { GEORGIA_RESIDENTIAL_PLAYBOOK } from "@/lib/build/georgia-residential-playbook";

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
    supabase
      .from("project_milestones")
      .select("phase_key, status")
      .eq("project_id", id),
    supabase
      .from("project_tasks")
      .select("phase_key, status")
      .eq("project_id", id),
  ]);

  const applied = Boolean(project.playbook_applied_at);
  const progress = applied
    ? getPlaybookProgress(milestones ?? [], tasks ?? [])
    : [];

  const totalTasks = (tasks ?? []).length;
  const doneTasks = (tasks ?? []).filter((t) => t.status === "done").length;
  const overallPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h2 className="font-display text-2xl text-ink">Build System</h2>
        <p className="mt-3 text-ink/65 leading-relaxed max-w-2xl">
          {GEORGIA_RESIDENTIAL_PLAYBOOK.description}
        </p>
      </div>

      {!applied ? (
        <div className="bg-navy text-bone p-8 md:p-10 mb-10">
          <span className="eyebrow-copper">— Get started</span>
          <h3 className="mt-4 font-display text-xl">Apply the Georgia residential playbook</h3>
          <p className="mt-3 text-bone/70 text-sm leading-relaxed max-w-xl">
            Seeds {GEORGIA_RESIDENTIAL_PLAYBOOK.milestones.length} client timeline phases and{" "}
            {GEORGIA_RESIDENTIAL_PLAYBOOK.milestones.reduce((n, m) => n + m.tasks.length, 0)}{" "}
            internal checklist items — permits, inspections, termite pretreat, lien waivers, and
            closeout — so every home runs the same proven sequence.
          </p>
          <form
            action={async (fd) => {
              "use server";
              await applyGeorgiaPlaybook(fd);
            }}
            className="mt-8"
          >
            <input type="hidden" name="project_id" value={id} />
            <button
              type="submit"
              className="inline-flex h-12 items-center px-6 bg-copper text-bone hover:bg-copper-400 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors"
            >
              Apply Playbook to This Project
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="p-6 border border-ink/15 bg-paper">
              <div className="eyebrow">Overall</div>
              <div className="font-display text-3xl text-ink mt-2">{overallPct}%</div>
              <div className="text-xs font-mono text-stone-300 mt-1">
                {doneTasks}/{totalTasks} tasks
              </div>
            </div>
            <div className="p-6 border border-ink/15 bg-paper">
              <div className="eyebrow">Playbook</div>
              <div className="text-sm text-ink mt-2 font-medium">{GEORGIA_RESIDENTIAL_PLAYBOOK.name}</div>
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
              className="inline-flex h-11 items-center px-5 bg-ink text-bone font-mono text-[10px] tracking-[0.2em] uppercase"
            >
              Open Checklists →
            </Link>
            <Link
              href={`/admin/projects/${id}/milestones`}
              className="inline-flex h-11 items-center px-5 border border-ink/25 font-mono text-[10px] tracking-[0.2em] uppercase"
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
            <form
              action={async (fd) => {
                "use server";
                await applyGeorgiaPlaybook(fd);
              }}
              className="mt-6"
            >
              <input type="hidden" name="project_id" value={id} />
              <input type="hidden" name="replace" value="on" />
              <p className="text-ink/60 mb-4">
                Warning: this deletes existing milestones and tasks for this project and re-seeds
                from the template.
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
