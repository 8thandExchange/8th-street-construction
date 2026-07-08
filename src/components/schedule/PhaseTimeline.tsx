import type { GanttMilestone } from "@/lib/schedule/gantt";
import { daysBetween, resolveMilestoneDates } from "@/lib/schedule/gantt-dates";
import { MILESTONE_STATUS_LABELS, MILESTONE_STATUS_STYLES } from "@/lib/project/labels";

const DOT_TONES: Record<string, string> = {
  completed: "bg-emerald-500 border-emerald-500",
  in_progress: "bg-copper border-copper",
  blocked: "bg-amber-400 border-amber-400",
  pending: "bg-paper border-stone-300",
};

const DATE_LABEL: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

function fmt(date: Date) {
  return date.toLocaleDateString("en-US", DATE_LABEL);
}

function dateLine(m: GanttMilestone, dateMode: "internal" | "client") {
  const { start, end } = resolveMilestoneDates(m, dateMode);
  if (!start && !end) return null;
  if (start && end && start.getTime() !== end.getTime())
    return `${fmt(start)} – ${fmt(end)}`;
  return `Target: ${fmt((end ?? start)!)}`;
}

function completionNote(m: GanttMilestone) {
  if (m.status !== "completed" || !m.completed_at) return null;
  const finished = new Date(m.completed_at);
  if (Number.isNaN(finished.getTime())) return null;
  let note = `Finished ${fmt(finished)}`;
  if (m.target_date) {
    const target = new Date(`${m.target_date}T12:00:00`);
    if (!Number.isNaN(target.getTime())) {
      const diff = Math.round(daysBetween(finished, target));
      if (diff > 0) note += ` — ${diff} day${diff === 1 ? "" : "s"} early`;
      else if (diff < 0) note += ` — ${-diff} day${diff === -1 ? "" : "s"} late`;
      else note += " — right on target";
    }
  }
  return note;
}

function daysPast(m: GanttMilestone, dateMode: "internal" | "client", today: Date) {
  if (m.status === "completed") return 0;
  const { end } = resolveMilestoneDates(m, dateMode);
  if (!end || end >= today) return 0;
  return Math.max(1, Math.floor(daysBetween(end, today)));
}

type PhaseTimelineProps = {
  milestones: GanttMilestone[];
  dateMode?: "internal" | "client";
  today?: Date;
};

/**
 * Mobile-first vertical build timeline — the Buildertrend-style phase list.
 * Every phase shows its dates, status, what happens during it, task progress,
 * and honest early/late notes once finished.
 */
export function PhaseTimeline({
  milestones,
  dateMode = "client",
  today = new Date(),
}: PhaseTimelineProps) {
  today.setHours(12, 0, 0, 0);

  if (!milestones.length) {
    return (
      <div className="hub-panel p-10 text-center">
        <p className="font-display text-lg text-ink/70">No schedule yet</p>
        <p className="mt-2 text-sm text-ink/45 max-w-sm mx-auto leading-relaxed">
          Phases will appear here as the build plan is set up.
        </p>
      </div>
    );
  }

  return (
    <ol className="relative">
      {milestones.map((m, i) => {
        const isLast = i === milestones.length - 1;
        const dates = dateLine(m, dateMode);
        const finished = completionNote(m);
        const late = daysPast(m, dateMode, today);
        const active = m.status === "in_progress";
        const showProgress =
          active && typeof m.progress === "number" && m.progress > 0;

        return (
          <li key={m.id} className="relative pl-9 pb-8 last:pb-0">
            {/* Connector */}
            {!isLast && (
              <span
                className={`absolute left-[7px] top-6 bottom-0 w-px ${
                  m.status === "completed" ? "bg-emerald-300" : "bg-ink/10"
                }`}
                aria-hidden
              />
            )}
            {/* Status dot */}
            <span
              className={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 ${
                DOT_TONES[m.status] ?? DOT_TONES.pending
              } ${active ? "ring-4 ring-copper/15" : ""}`}
              aria-hidden
            />

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h3 className="font-display text-lg text-ink leading-tight">{m.title}</h3>
              <span
                className={`text-[9px] font-mono tracking-[0.12em] uppercase px-2 py-0.5 border ${
                  MILESTONE_STATUS_STYLES[m.status] ?? MILESTONE_STATUS_STYLES.pending
                }`}
              >
                {MILESTONE_STATUS_LABELS[m.status] ?? m.status}
              </span>
              {late > 0 && (
                <span className="text-[9px] font-mono tracking-[0.12em] uppercase px-2 py-0.5 border border-amber-200 bg-amber-50 text-amber-800">
                  {late} day{late === 1 ? "" : "s"} past target
                </span>
              )}
              {m.volunteer_friendly && (
                <span className="text-[9px] font-mono tracking-[0.12em] uppercase px-2 py-0.5 border border-emerald-200 bg-emerald-50 text-emerald-700">
                  Volunteer stage
                </span>
              )}
            </div>

            {(dates || finished) && (
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-stone-400">
                {finished ?? dates}
              </p>
            )}
            {!dates && !finished && (
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-stone-300">
                Date TBD
              </p>
            )}

            {m.description && (
              <p className="mt-2 text-sm text-ink/55 leading-relaxed max-w-xl">
                {m.description}
              </p>
            )}

            {m.volunteer_friendly && m.volunteer_notes && (
              <p className="mt-2 border-l-2 border-emerald-300 pl-3 text-sm text-emerald-800/80 leading-relaxed max-w-xl">
                {m.volunteer_notes}
              </p>
            )}

            {showProgress && (
              <div className="mt-3 max-w-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-stone-400">
                    Phase progress
                  </span>
                  <span className="font-mono text-[9px] text-copper">{m.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-ink/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-copper rounded-full"
                    style={{ width: `${m.progress}%` }}
                  />
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
