import { HubMetric, ProgressRing } from "@/components/hub/HubUI";
import { MILESTONE_STATUS_LABELS, MILESTONE_STATUS_STYLES } from "@/lib/project/labels";
import { appStatusBadge } from "@/lib/project/status-badges";
import type { ScheduleSummary } from "@/lib/schedule/summary";

type ScheduleDashboardProps = {
  summary: ScheduleSummary;
  projectStartLabel?: string | null;
  projectEndLabel?: string | null;
  /** Client audience hides admin-only hints (e.g. drag-to-reschedule) */
  audience?: "admin" | "client";
};

export function ScheduleDashboard({
  summary,
  projectStartLabel,
  projectEndLabel,
  audience = "admin",
}: ScheduleDashboardProps) {
  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-center">
        <div className="flex justify-center lg:justify-start">
          <ProgressRing pct={summary.overallProgress} size={120} label="Complete" />
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <HubMetric
            label="Phases"
            value={summary.totalPhases}
            sub={`${summary.completedPhases} complete · ${summary.inProgressPhases} active`}
          />
          <HubMetric
            label="Start"
            value={projectStartLabel ?? "TBD"}
            sub="Project kickoff"
          />
          <HubMetric
            label="Target finish"
            value={projectEndLabel ?? "TBD"}
            sub={
              summary.daysRemaining != null
                ? `${summary.daysRemaining} days remaining`
                : "Completion target"
            }
            accent={summary.daysRemaining != null && summary.daysRemaining <= 30}
          />
          <HubMetric
            label="Blocked"
            value={summary.blockedPhases}
            sub={summary.blockedPhases ? "Needs attention" : "Nothing blocked"}
            accent={summary.blockedPhases > 0}
          />
        </div>
      </div>

      <section className="hub-panel p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-copper">
              This week
            </p>
            <h3 className="mt-1 font-display text-xl text-ink">Agenda</h3>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
            {summary.phasesThisWeek.length} phase
            {summary.phasesThisWeek.length === 1 ? "" : "s"} on the calendar
          </p>
        </div>

        {summary.phasesThisWeek.length ? (
          <ul className="divide-y divide-ink/8 border border-ink/10">
            {summary.phasesThisWeek.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-paper/40"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{item.title}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-stone-400">
                    {item.kind === "starts"
                      ? "Starts"
                      : item.kind === "ends"
                        ? "Ends"
                        : "Active"}{" "}
                    · {item.dateLabel}
                  </p>
                </div>
                <span
                  className={
                    audience === "client"
                      ? `text-[9px] font-mono tracking-[0.12em] uppercase px-2 py-0.5 border ${
                          MILESTONE_STATUS_STYLES[item.status] ?? MILESTONE_STATUS_STYLES.pending
                        }`
                      : appStatusBadge("milestone", item.status)
                  }
                >
                  {MILESTONE_STATUS_LABELS[item.status] ?? item.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink/50 leading-relaxed">
            {audience === "client"
              ? "No phase starts or finishes on the calendar this week — the timeline below shows what's ahead."
              : "No phase starts or finishes scheduled this week. Drag the Gantt bars to adjust timing."}
          </p>
        )}
      </section>
    </div>
  );
}
