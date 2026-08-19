import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ScheduleTimeline } from "@/components/project-hub/ScheduleTimeline";
import { InteractiveScheduleGantt } from "@/components/schedule/InteractiveScheduleGantt";
import { ScheduleDashboard } from "@/components/schedule/ScheduleDashboard";
import { ShareManager } from "@/components/schedule/ShareManager";
import { AiScheduleGenerator } from "@/components/schedule/AiScheduleGenerator";
import { getProjectShareSettings } from "@/lib/actions/project-share";
import { loadGanttMilestones } from "@/lib/schedule/load-gantt-milestones";
import { computeScheduleSummary } from "@/lib/schedule/summary";

export const dynamic = "force-dynamic";

export default async function ProjectSchedulePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, start_date, target_completion_date")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const milestones = await loadGanttMilestones(supabase, id);
  const shareSettings = await getProjectShareSettings(id);

  const scheduleMilestones = milestones.map((milestone) => ({
    id: milestone.id,
    title: milestone.title,
    status: milestone.status,
    target_date: milestone.target_date ?? null,
    scheduled_start: milestone.scheduled_start ?? null,
    scheduled_end: milestone.scheduled_end ?? null,
    display_order: milestone.display_order ?? 0,
    predecessor_id: milestone.predecessor_id ?? null,
  }));

  function fmtDate(date: string | null | undefined) {
    if (!date) return null;
    return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const summary = computeScheduleSummary(milestones, {
    projectStart: project.start_date,
    projectEnd: project.target_completion_date,
    dateMode: "internal",
  });

  return (
    <div className="max-w-6xl space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="app-label">Build</p>
          <h2 className="mt-2 app-h1">Schedule</h2>
          <p className="mt-2 text-sm app-muted max-w-2xl leading-relaxed">
            Drag phase bars to reschedule, preview the client view, and share a password-protected
            progress page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/projects/${id}/schedule/pdf`}
            target="_blank"
            className="app-btn app-btn-secondary"
          >
            Download PDF
          </a>
          <Link
            href={`/print/schedule/${id}`}
            target="_blank"
            className="app-btn app-btn-secondary"
          >
            Checklist view
          </Link>
        </div>
      </div>

      {!milestones.length ? (
        <p className="app-card p-10 text-center text-sm italic app-muted">
          Apply a build playbook or add milestones to build the schedule.
        </p>
      ) : (
        <>
          <ScheduleDashboard
            summary={summary}
            projectStartLabel={fmtDate(project.start_date)}
            projectEndLabel={fmtDate(project.target_completion_date)}
          />

          <InteractiveScheduleGantt
            projectId={id}
            milestones={milestones}
            projectStart={project.start_date}
            projectEnd={project.target_completion_date}
            title={project.title}
            subtitle="Internal planning view — checklist progress fills each bar."
          />

          <AiScheduleGenerator
            projectId={id}
            defaultStart={project.start_date}
            defaultEnd={project.target_completion_date}
          />

          <ShareManager projectId={id} settings={shareSettings} />

          <ScheduleTimeline
            projectId={id}
            projectStart={project.start_date}
            projectEnd={project.target_completion_date}
            milestones={scheduleMilestones}
          />
        </>
      )}
    </div>
  );
}
