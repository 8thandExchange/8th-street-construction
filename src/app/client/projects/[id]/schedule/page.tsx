import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProjectGantt } from "@/components/schedule/ProjectGantt";

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
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-4xl">
      <Link
        href={`/client/projects/${id}`}
        className="text-xs font-mono tracking-[0.18em] uppercase text-stone-300 hover:text-ink transition-colors"
      >
        ← Overview
      </Link>
      <header className="mt-4 mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-copper">Build progress</p>
        <h2 className="mt-2 font-display text-3xl md:text-4xl text-ink tracking-tight">Schedule</h2>
        <p className="mt-3 text-[15px] text-ink/60 leading-relaxed max-w-xl">
          A live view of each construction phase and its target dates — updated as your build moves
          forward.
        </p>
      </header>

      {(project.start_date || project.target_completion_date) && (
        <div className="mb-8 grid grid-cols-2 gap-3 max-w-md">
          <div className="hub-metric">
            <div className="eyebrow">Start</div>
            <div className="font-display text-lg mt-2">{fmt(project.start_date) ?? "TBD"}</div>
          </div>
          <div className="hub-metric">
            <div className="eyebrow">Target completion</div>
            <div className="font-display text-lg mt-2">
              {fmt(project.target_completion_date) ?? "TBD"}
            </div>
          </div>
        </div>
      )}

      <ProjectGantt
        milestones={milestones ?? []}
        projectStart={project.start_date}
        projectEnd={project.target_completion_date}
        dateMode="client"
        title={project.title}
        subtitle="Target dates for each phase of your build."
      />
    </div>
  );
}
