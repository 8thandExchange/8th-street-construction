import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintPacketButton } from "@/components/billing/PrintPacketButton";
import { loadGanttMilestones } from "@/lib/schedule/load-gantt-milestones";
import { computeScheduleHealth } from "@/lib/schedule/health";
import { resolveMilestoneDates } from "@/lib/schedule/gantt-dates";
import { isFeatureEnabled } from "@/lib/portal/features";
import { MILESTONE_STATUS_LABELS } from "@/lib/project/labels";

export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const fmtIso = (s: string | null | undefined) =>
  s ? fmt(new Date(`${s}T12:00:00`)) : null;

const HEALTH_LABELS: Record<string, string> = {
  on_track: "On track",
  watch: "Needs attention",
  behind: "Behind schedule",
  complete: "All phases complete",
  unscheduled: "Dates pending",
};

export default async function PrintSchedulePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, title, street_address, location, start_date, target_completion_date, client_id, portal_features"
    )
    .eq("id", id)
    .single();
  if (!project) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";
  const isProjectClient = project.client_id === user.id;
  if (!isAdmin && !isProjectClient) redirect("/");
  if (isProjectClient && !isFeatureEnabled(project.portal_features, "schedule")) notFound();

  const milestones = await loadGanttMilestones(supabase, id);
  const { data: tasks } = await supabase
    .from("project_tasks")
    .select("milestone_id, title, status, due_date, display_order")
    .eq("project_id", id)
    .order("display_order", { ascending: true });

  const health = computeScheduleHealth(milestones, { dateMode: "client" });
  const today = new Date();

  return (
    <main className="min-h-screen bg-stone-100 print:bg-white">
      <div className="mx-auto max-w-4xl px-6 pt-6 print:hidden">
        <div className="flex items-center justify-end rounded-xl border border-ink/10 bg-white px-4 py-3">
          <PrintPacketButton />
        </div>
      </div>

      <div className="mx-auto my-6 max-w-4xl bg-white px-10 py-12 shadow-sm print:my-0 print:max-w-none print:px-0 print:py-0 print:shadow-none">
        <header className="border-b-2 border-black pb-4">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-black">Build Schedule</h1>
              <p className="mt-0.5 text-[12px] text-black/70">
                {project.street_address || project.title}
                {project.location ? ` — ${project.location}` : ""}
              </p>
            </div>
            <div className="text-right text-[12px] leading-relaxed text-black/80">
              <div className="font-semibold text-black">8th Street Construction</div>
              <div>A division of 8th and Exchange Capital</div>
              <div>Printed {fmt(today)}</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-[12px] text-black/80">
            <span>
              <span className="text-black/50">Start:</span>{" "}
              {fmtIso(project.start_date) ?? "TBD"}
            </span>
            <span>
              <span className="text-black/50">Target completion:</span>{" "}
              {fmtIso(project.target_completion_date) ?? "TBD"}
            </span>
            <span>
              <span className="text-black/50">Status:</span>{" "}
              <strong>{HEALTH_LABELS[health.state]}</strong>
              {health.latePhases[0] &&
                ` — ${health.latePhases[0].title} is ${health.latePhases[0].daysLate} day${
                  health.latePhases[0].daysLate === 1 ? "" : "s"
                } past target`}
            </span>
          </div>
        </header>

        {milestones.map((m) => {
          const { start, end } = resolveMilestoneDates(m, "client");
          const phaseTasks = (tasks ?? []).filter((t) => t.milestone_id === m.id);
          const dateLabel =
            start && end && start.getTime() !== end.getTime()
              ? `${fmt(start)} – ${fmt(end)}`
              : end || start
                ? `Target: ${fmt((end ?? start)!)}`
                : "Dates TBD";
          return (
            <section key={m.id} className="mt-6 break-inside-avoid border-b border-black/10 pb-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h2 className="text-[14px] font-bold text-black">
                  {m.title}
                  {m.volunteer_friendly && (
                    <span className="ml-2 rounded border border-black/30 px-1.5 py-0.5 align-middle text-[9px] font-semibold uppercase tracking-wide text-black/70">
                      Volunteer stage
                    </span>
                  )}
                </h2>
                <div className="text-[11.5px] text-black/70">
                  {dateLabel} · {MILESTONE_STATUS_LABELS[m.status] ?? m.status}
                  {m.status !== "completed" && typeof m.progress === "number" && m.progress > 0
                    ? ` · ${m.progress}% of tasks done`
                    : ""}
                </div>
              </div>
              {m.description && (
                <p className="mt-1 text-[11.5px] leading-relaxed text-black/65">{m.description}</p>
              )}
              {m.volunteer_friendly && m.volunteer_notes && (
                <p className="mt-1 text-[11.5px] italic leading-relaxed text-black/65">
                  Volunteers: {m.volunteer_notes}
                </p>
              )}
              {phaseTasks.length > 0 && (
                <ul className="mt-2 grid grid-cols-1 gap-x-8 gap-y-0.5 sm:grid-cols-2">
                  {phaseTasks.map((t, idx) => (
                    <li
                      key={`${m.id}-${idx}`}
                      className="flex items-baseline justify-between gap-3 text-[11px] text-black/80"
                    >
                      <span className="min-w-0">
                        <span className="mr-1.5 inline-block w-3 text-center">
                          {t.status === "done" ? "☑" : "☐"}
                        </span>
                        {t.title}
                      </span>
                      <span className="shrink-0 tabular-nums text-black/50">
                        {fmtIso(t.due_date) ?? ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        <footer className="mt-8 text-[10.5px] leading-relaxed text-black/55">
          Target dates reflect the current construction plan and adjust as the build progresses —
          the project portal always shows the live schedule. Questions: hello@8thstreetconstruction.com
        </footer>
      </div>
    </main>
  );
}
