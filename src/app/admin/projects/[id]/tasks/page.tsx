import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TaskChecklist, type PhaseGroup } from "@/components/project-hub/TaskChecklist";
import { GEORGIA_RESIDENTIAL_PLAYBOOK } from "@/lib/build/georgia-residential-playbook";

export const dynamic = "force-dynamic";

export default async function ProjectTasksPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, playbook_applied_at")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const [{ data: milestones }, { data: tasks }] = await Promise.all([
    supabase
      .from("project_milestones")
      .select("id, phase_key, title, display_order")
      .eq("project_id", id)
      .order("display_order", { ascending: true }),
    supabase
      .from("project_tasks")
      .select(
        "id, title, description, status, priority, phase_key, milestone_id, display_order"
      )
      .eq("project_id", id)
      .order("display_order", { ascending: true }),
  ]);

  if (!project.playbook_applied_at) {
    return (
      <div className="max-w-2xl">
        <h2 className="font-display text-2xl text-ink">Checklists</h2>
        <p className="mt-4 text-ink/65">
          Apply the Georgia residential playbook first to seed phase checklists.
        </p>
        <Link
          href={`/admin/projects/${id}/build`}
          className="inline-flex mt-6 h-11 items-center px-5 bg-ink text-bone font-mono text-[10px] tracking-[0.2em] uppercase"
        >
          Go to Build System →
        </Link>
      </div>
    );
  }

  const phaseOrder = GEORGIA_RESIDENTIAL_PLAYBOOK.milestones.map((m) => m.phaseKey);
  const phases: PhaseGroup[] = phaseOrder.map((phaseKey) => {
    const template = GEORGIA_RESIDENTIAL_PLAYBOOK.milestones.find((m) => m.phaseKey === phaseKey);
    const milestone = (milestones ?? []).find((m) => m.phase_key === phaseKey);
    return {
      phaseKey,
      title: milestone?.title ?? template?.title ?? phaseKey,
      milestoneId: milestone?.id ?? null,
      tasks: (tasks ?? []).filter((t) => t.phase_key === phaseKey),
    };
  });

  const done = (tasks ?? []).filter((t) => t.status === "done").length;
  const total = (tasks ?? []).length;

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="font-display text-2xl text-ink">Phase Checklists</h2>
          <p className="text-sm text-ink/60 mt-2">
            {done}/{total} complete — work top to bottom. Client sees milestones on Timeline.
          </p>
        </div>
        <Link
          href={`/admin/projects/${id}/build`}
          className="font-mono text-[10px] tracking-[0.15em] uppercase text-copper hover:underline"
        >
          Build System overview
        </Link>
      </div>

      <TaskChecklist projectId={id} phases={phases} />
    </div>
  );
}
