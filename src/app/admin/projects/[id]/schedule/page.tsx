import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
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
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-copper">Build</p>
        <h2 className="mt-2 font-display text-2xl md:text-3xl text-ink">Schedule</h2>
        <p className="mt-2 text-sm text-ink/60 max-w-2xl leading-relaxed">
          Drag phase bars to reschedule, preview the client view, and share a password-protected
          progress page.
        </p>
      </div>

      {!milestones.length ? (
        <p className="text-ink/50 italic p-8 border border-dashed border-ink/20">
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
