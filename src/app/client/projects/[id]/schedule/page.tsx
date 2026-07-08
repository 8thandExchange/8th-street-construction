import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/portal/features";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProjectGantt } from "@/components/schedule/ProjectGantt";
import { ScheduleDashboard } from "@/components/schedule/ScheduleDashboard";
import { ScheduleHealthBanner } from "@/components/schedule/ScheduleHealthBanner";
import { PhaseTimeline } from "@/components/schedule/PhaseTimeline";
import { ScheduleViews } from "@/components/schedule/ScheduleViews";
import { loadGanttMilestones } from "@/lib/schedule/load-gantt-milestones";
import { computeScheduleSummary } from "@/lib/schedule/summary";
import { computeScheduleHealth } from "@/lib/schedule/health";

export const dynamic = "force-dynamic";

function fmt(date: string | null) {
  if (!date) return null;
  return new Date(date + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ClientSchedulePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, start_date, target_completion_date, portal_features")
    .eq("id", id)
    .single();
  if (!project) notFound();
  if (!isFeatureEnabled(project.portal_features, "schedule")) notFound();


  const milestones = await loadGanttMilestones(supabase, id);
  const summary = computeScheduleSummary(milestones, {
    projectStart: project.start_date,
    projectEnd: project.target_completion_date,
    dateMode: "client",
  });
  const health = computeScheduleHealth(milestones, { dateMode: "client" });

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-4xl">
      <Link
        href={`/client/projects/${id}`}
        className="text-xs font-mono tracking-[0.18em] uppercase text-stone-300 hover:text-ink transition-colors"
      >
        ← Overview
      </Link>
      <header className="mt-4 mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-copper">
              Build progress
            </p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl text-ink tracking-tight">
              Schedule
            </h2>
          </div>
          <Link
            href={`/print/schedule/${id}`}
            target="_blank"
            className="inline-flex h-9 items-center border border-ink/20 px-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/70 transition-colors hover:border-ink/40 hover:text-ink"
          >
            Print / PDF
          </Link>
        </div>
        <p className="mt-3 text-[15px] text-ink/60 leading-relaxed max-w-xl">
          A live view of each construction phase and its target dates — updated as your build moves
          forward.
        </p>
      </header>

      <div className="mb-6">
        <ScheduleHealthBanner health={health} />
      </div>

      <ScheduleDashboard
        summary={summary}
        projectStartLabel={fmt(project.start_date) ?? "TBD"}
        projectEndLabel={fmt(project.target_completion_date) ?? "TBD"}
        audience="client"
      />

      <ScheduleViews
        timeline={
          <section className="hub-panel p-6 md:p-8">
            <div className="mb-7">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-copper">
                Phase by phase
              </p>
              <h3 className="mt-1 font-display text-xl md:text-2xl text-ink tracking-tight">
                Your build timeline
              </h3>
            </div>
            <PhaseTimeline milestones={milestones} dateMode="client" />
          </section>
        }
        chart={
          <ProjectGantt
            milestones={milestones}
            projectStart={project.start_date}
            projectEnd={project.target_completion_date}
            dateMode="client"
            title={project.title}
            subtitle="Target dates for each phase of your build."
          />
        }
      />
    </div>
  );
}
