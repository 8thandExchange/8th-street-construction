import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ScheduleTimeline } from "@/components/project-hub/ScheduleTimeline";
import { ProjectGantt } from "@/components/schedule/ProjectGantt";
import { ShareManager } from "@/components/schedule/ShareManager";
import { AiScheduleGenerator } from "@/components/schedule/AiScheduleGenerator";
import { getProjectShareSettings } from "@/lib/actions/project-share";

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

  const shareSettings = await getProjectShareSettings(id);

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h2 className="font-display text-2xl text-ink mb-2">Schedule</h2>
        <p className="text-sm text-ink/60">
          Plan phase dates, preview the client Gantt, and share a password-protected progress page.
        </p>
      </div>

      {!milestones?.length ? (
        <p className="text-ink/50 italic p-8 border border-dashed border-ink/20">
          Apply a build playbook or add milestones to build the schedule.
        </p>
      ) : (
        <>
          <ProjectGantt
            milestones={milestones}
            projectStart={project.start_date}
            projectEnd={project.target_completion_date}
            dateMode="internal"
            title={project.title}
            subtitle="Internal planning view — clients see target dates."
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
            milestones={milestones}
          />
        </>
      )}
    </div>
  );
}
