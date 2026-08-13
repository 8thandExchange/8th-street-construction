import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TaskChecklist, type PhaseGroup, type TaskRow } from "@/components/project-hub/TaskChecklist";
import type { ChecklistItem } from "@/components/project-hub/ChecklistItems";
import { getPlaybookById, DEFAULT_PLAYBOOK_ID } from "@/lib/build/playbook-registry";
import { CUSTOM_PHASE_KEY, CUSTOM_PHASE_TITLE } from "@/lib/build/task-phases";

export const dynamic = "force-dynamic";

function buildPhases(
  playbookApplied: boolean,
  playbookId: string | null,
  milestones: { id: string; phase_key: string | null; title: string }[],
  tasks: TaskRow[]
): PhaseGroup[] {
  const customTasks = tasks.filter(
    (t) =>
      t.is_custom &&
      (t.phase_key === CUSTOM_PHASE_KEY || t.phase_key === null || t.phase_key === "")
  );

  if (!playbookApplied) {
    return [
      {
        phaseKey: CUSTOM_PHASE_KEY,
        title: CUSTOM_PHASE_TITLE,
        milestoneId: null,
        hint: "Add tasks unique to this job. Apply a GA or SC playbook anytime from Build System to seed the standard checklist too.",
        tasks: tasks.filter(
          (t) =>
            t.phase_key === CUSTOM_PHASE_KEY ||
            t.phase_key === null ||
            t.phase_key === ""
        ),
      },
    ];
  }

  const playbook =
    getPlaybookById(playbookId ?? DEFAULT_PLAYBOOK_ID) ??
    getPlaybookById(DEFAULT_PLAYBOOK_ID)!;

  const phaseOrder = playbook.milestones.map((m) => m.phaseKey);
  const phases: PhaseGroup[] = phaseOrder.map((phaseKey) => {
    const template = playbook.milestones.find((m) => m.phaseKey === phaseKey);
    const milestone = milestones.find((m) => m.phase_key === phaseKey);
    return {
      phaseKey,
      title: milestone?.title ?? template?.title ?? phaseKey,
      milestoneId: milestone?.id ?? null,
      tasks: tasks.filter((t) => t.phase_key === phaseKey),
    };
  });

  phases.push({
    phaseKey: CUSTOM_PHASE_KEY,
    title: CUSTOM_PHASE_TITLE,
    milestoneId: null,
    hint: "One-off items for this address — easements, neighbor coordination, special inspections, owner requests.",
    tasks: customTasks,
  });

  return phases;
}

export default async function ProjectTasksPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, playbook_applied_at, playbook_id")
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
        "id, title, description, status, priority, phase_key, milestone_id, display_order, is_custom, due_date"
      )
      .eq("project_id", id)
      .order("display_order", { ascending: true }),
  ]);

  // Checklist steps under each task, with short-lived signed URLs for
  // the proof photos (the documents bucket is private).
  const { data: checklistRows } = await supabase
    .from("task_checklist_items")
    .select("id, task_id, label, done, done_at, photo_path, display_order")
    .in("task_id", (tasks ?? []).map((t: { id: string }) => t.id))
    .order("display_order", { ascending: true });

  const checklistByTask: Record<string, ChecklistItem[]> = {};
  for (const row of checklistRows ?? []) {
    let photoUrl: string | null = null;
    if (row.photo_path) {
      const { data: signed } = await supabase.storage
        .from("project-documents")
        .createSignedUrl(row.photo_path, 3600);
      photoUrl = signed?.signedUrl ?? null;
    }
    (checklistByTask[row.task_id] ??= []).push({
      id: row.id,
      label: row.label,
      done: row.done,
      done_at: row.done_at,
      photo_path: row.photo_path,
      photo_url: photoUrl,
    });
  }

  const taskRows = (tasks ?? []) as TaskRow[];
  const phases = buildPhases(
    Boolean(project.playbook_applied_at),
    project.playbook_id,
    milestones ?? [],
    taskRows
  );

  const done = taskRows.filter((t) => t.status === "done").length;
  const total = taskRows.length;
  const customCount = taskRows.filter((t) => t.is_custom).length;

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="app-h1 !text-[18px]">Phase Checklists</h2>
          <p className="text-sm text-ink/60 mt-2">
            {done}/{total} complete
            {customCount > 0 && ` · ${customCount} custom`}
            {project.playbook_applied_at
              ? " — playbook tasks + your site-specific additions."
              : " — add custom tasks now, or apply a playbook from Build System."}
          </p>
        </div>
        <Link
          href={`/admin/projects/${id}/build`}
          className="font-mono text-[10px] tracking-[0.15em] uppercase text-copper hover:underline"
        >
          Build System overview
        </Link>
      </div>

      {!project.playbook_applied_at && (
        <div className="mb-8 p-5 border border-copper/30 bg-copper/5 text-sm text-ink/70">
          No playbook applied yet. You can still track{" "}
          <strong className="text-ink font-medium">project-specific tasks</strong> below, or{" "}
          <Link href={`/admin/projects/${id}/build`} className="text-copper hover:underline">
            apply the GA or SC playbook
          </Link>{" "}
          to seed the full residential checklist.
        </div>
      )}

      <TaskChecklist projectId={id} phases={phases} checklistByTask={checklistByTask} />
    </div>
  );
}
