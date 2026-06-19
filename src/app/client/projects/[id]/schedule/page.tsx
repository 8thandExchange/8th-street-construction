import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const MILESTONE_STATUS_COLORS: Record<string, string> = {
  pending: "border-stone-300 text-stone-300",
  in_progress: "border-copper/50 text-copper bg-copper/5",
  completed: "border-emerald-500/50 text-emerald-600 bg-emerald-50",
  blocked: "border-amber-500/50 text-amber-600",
};

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
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-3xl">
      <Link
        href={`/client/projects/${id}`}
        className="text-xs font-mono tracking-[0.18em] uppercase text-stone-300 hover:text-ink transition-colors"
      >
        ← Overview
      </Link>
      <h2 className="mt-4 font-display text-xl text-ink mb-2">Schedule</h2>
      <p className="mt-2 text-sm text-ink/60">
        Target dates for each phase of your project.
      </p>

      {(project.start_date || project.target_completion_date) && (
        <div className="mt-8 grid grid-cols-2 gap-3">
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

      <ol className="mt-10 space-y-3">
        {(milestones ?? []).map((m) => {
          const start = fmt(m.scheduled_start);
          const end = fmt(m.scheduled_end ?? m.target_date);
          return (
            <li key={m.id} className="p-5 border border-ink/15 bg-paper">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      m.status === "completed"
                        ? "bg-emerald-500"
                        : m.status === "in_progress"
                          ? "bg-copper"
                          : "bg-stone-300"
                    }`}
                  />
                  <h3 className="font-medium text-ink">{m.title}</h3>
                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.5 border ${MILESTONE_STATUS_COLORS[m.status] ?? ""}`}
                  >
                    {m.status.replace("_", " ")}
                  </span>
                </div>
                <div className="text-xs font-mono text-stone-300">
                  {start && end ? `${start} – ${end}` : end ? `Target ${end}` : "Date TBD"}
                </div>
              </div>
            </li>
          );
        })}
        {!milestones?.length && (
          <p className="text-ink/50 italic py-12 text-center border border-dashed border-ink/20">
            Your schedule will appear here as phases are published.
          </p>
        )}
      </ol>
    </div>
  );
}
