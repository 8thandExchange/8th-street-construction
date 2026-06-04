import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ScheduleTimeline } from "@/components/project-hub/ScheduleTimeline";

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

  const { data: milestones } = await supabase
    .from("project_milestones")
    .select("id, title, status, target_date, scheduled_start, scheduled_end, display_order")
    .eq("project_id", id)
    .order("display_order", { ascending: true });

  return (
    <div className="max-w-4xl">
      <h2 className="font-display text-2xl text-ink mb-2">Schedule</h2>
      <p className="text-sm text-ink/60 mb-8">
        Gantt-style view of phase dates. Set start/end per milestone — client sees target dates on
        Timeline.
      </p>
      {!milestones?.length ? (
        <p className="text-ink/50 italic p-8 border border-dashed border-ink/20">
          Apply a build playbook or add milestones to build the schedule.
        </p>
      ) : (
        <ScheduleTimeline
          projectId={id}
          projectStart={project.start_date}
          projectEnd={project.target_completion_date}
          milestones={milestones}
        />
      )}
    </div>
  );
}
