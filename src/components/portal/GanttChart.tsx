import { cn } from "@/lib/utils";

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  display_order: number;
  start_date: string | null;
  target_date: string | null;
  completed_at: string | null;
};

type Props = {
  milestones: Milestone[];
  /** projects.start_date — anchors the first bar when a milestone has no start_date */
  projectStart?: string | null;
  /** projects.target_completion_date — extends the axis to the promised finish */
  projectTarget?: string | null;
};

const DAY = 86_400_000;

function parseDate(d: string | null | undefined): number | null {
  if (!d) return null;
  const t = Date.parse(`${d.slice(0, 10)}T00:00:00`);
  return Number.isNaN(t) ? null : t;
}

function monthLabel(t: number) {
  return new Date(t).toLocaleDateString("en-US", { month: "short" });
}

function fmtRange(start: number, end: number) {
  const f = (t: number) =>
    new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${f(start)} — ${f(end)}`;
}

/**
 * Server-rendered schedule chart. Bars are percent-positioned on a shared
 * time axis, so it needs no client JS and no horizontal scrolling. A
 * milestone spans start_date → target_date; when start_date is missing it
 * falls back to the previous phase's end (phases overlap in real builds,
 * so explicit start dates always win).
 */
export function GanttChart({ milestones, projectStart, projectTarget }: Props) {
  const today = (() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  })();

  // Resolve each milestone to a [start, end] window where possible.
  const rows: Array<Milestone & { start: number | null; end: number | null }> = [];
  let cursor = parseDate(projectStart) ?? null;
  for (const m of milestones) {
    const end = parseDate(m.completed_at) ?? parseDate(m.target_date);
    let start = parseDate(m.start_date) ?? cursor;
    if (start !== null && end !== null && start >= end) start = end - 7 * DAY;
    if (end === null) start = parseDate(m.start_date);
    rows.push({ ...m, start: end !== null ? start ?? end - 14 * DAY : start, end });
    if (end !== null) cursor = end;
  }

  const scheduled = rows.filter((r) => r.start !== null && r.end !== null);
  const unscheduled = rows.filter((r) => r.start === null || r.end === null);

  if (scheduled.length === 0) return null;

  const minT = Math.min(...scheduled.map((r) => r.start!));
  const maxT = Math.max(
    ...scheduled.map((r) => r.end!),
    parseDate(projectTarget) ?? -Infinity,
    today
  );
  // Pad the axis half a month each side so bars never kiss the frame.
  const pad = Math.max((maxT - minT) * 0.03, 5 * DAY);
  const axisStart = minT - pad;
  const axisEnd = maxT + pad;
  const span = axisEnd - axisStart;
  const pct = (t: number) => ((t - axisStart) / span) * 100;

  // Month gridlines across the axis.
  const months: Array<{ t: number; label: string }> = [];
  {
    const d = new Date(axisStart);
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    for (; d.getTime() < axisEnd; d.setMonth(d.getMonth() + 1)) {
      months.push({ t: d.getTime(), label: monthLabel(d.getTime()) });
    }
  }

  const completed = scheduled.filter((r) => r.status === "completed").length;
  const pctComplete = Math.round((completed / rows.length) * 100);
  const targetT = parseDate(projectTarget);
  const showToday = today > axisStart && today < axisEnd;

  const behind = scheduled.filter(
    (r) => r.status !== "completed" && r.end! < today
  ).length;

  return (
    <div>
      {/* Summary strip */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 mb-8">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-4xl text-ink leading-none">{pctComplete}%</span>
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45">
            {completed} of {rows.length} phases complete
          </span>
        </div>
        <span
          className={cn(
            "font-mono text-[10px] tracking-[0.18em] uppercase",
            behind > 0 ? "text-amber-600" : "text-emerald-700"
          )}
        >
          {behind > 0
            ? `${behind} phase${behind > 1 ? "s" : ""} past target`
            : "Tracking to schedule"}
        </span>
      </div>

      {/* Chart */}
      <div className="relative">
        {/* Month axis */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
          <div className="hidden md:block" />
          <div className="relative h-6 border-b border-ink/15">
            {months.map((m) => (
              <span
                key={m.t}
                className="absolute -translate-x-1/2 font-mono text-[9px] tracking-[0.18em] uppercase text-ink/40"
                style={{ left: `${pct(m.t)}%` }}
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div className="relative">
          {/* gridlines + today + target, spanning all rows (right column only on md+) */}
          <div className="absolute inset-y-0 left-0 md:left-[200px] right-0 pointer-events-none">
            {months.map((m) => (
              <div
                key={m.t}
                className="absolute inset-y-0 w-px bg-ink/[0.06]"
                style={{ left: `${pct(m.t)}%` }}
              />
            ))}
            {targetT !== null && targetT > axisStart && targetT < axisEnd && (
              <div
                className="absolute inset-y-0 w-px border-l border-dashed border-ink/30"
                style={{ left: `${pct(targetT)}%` }}
                title="Target completion"
              />
            )}
            {showToday && (
              <div
                className="absolute inset-y-0 w-px bg-copper z-10"
                style={{ left: `${pct(today)}%` }}
              >
                <span className="absolute -top-0.5 left-1.5 font-mono text-[8px] tracking-[0.2em] uppercase text-copper whitespace-nowrap">
                  Today
                </span>
              </div>
            )}
          </div>

          {scheduled.map((r) => {
            const left = pct(r.start!);
            const width = Math.max(pct(r.end!) - left, 0.75);
            const late = r.status !== "completed" && r.end! < today;
            return (
              <div
                key={r.id}
                className="group grid grid-cols-1 md:grid-cols-[200px_1fr] items-center border-b border-ink/[0.07] py-2.5 md:py-0 md:h-11 transition-colors hover:bg-ink/[0.025]"
              >
                <div className="pr-4 flex items-baseline justify-between md:block mb-1.5 md:mb-0">
                  <span
                    className={cn(
                      "text-[13px] leading-snug",
                      r.status === "completed" ? "text-ink/45" : "text-ink"
                    )}
                  >
                    {r.title}
                  </span>
                  <span className="md:hidden font-mono text-[9px] tracking-[0.12em] text-ink/40">
                    {fmtRange(r.start!, r.end!)}
                  </span>
                </div>
                <div className="relative h-5">
                  <div
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 h-[18px] transition-all duration-300",
                      r.status === "completed" && "bg-navy",
                      r.status === "in_progress" && "bg-copper gantt-bar-active",
                      r.status === "pending" && "bg-transparent border border-ink/25 group-hover:border-ink/45",
                      r.status === "blocked" && "bg-amber-100 border border-amber-500"
                    )}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${r.title} · ${fmtRange(r.start!, r.end!)}`}
                  />
                  {late && (
                    <span
                      className="absolute top-1/2 -translate-y-1/2 ml-2 font-mono text-[8px] tracking-[0.15em] uppercase text-amber-600 whitespace-nowrap"
                      style={{ left: `${left + width}%` }}
                    >
                      past target
                    </span>
                  )}
                  {/* Hover date range (desktop) */}
                  <span
                    className={cn(
                      "hidden md:block absolute top-1/2 -translate-y-1/2 font-mono text-[9px] tracking-[0.12em] text-ink/50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap",
                      left > 55 ? "-translate-x-full" : ""
                    )}
                    style={
                      left > 55
                        ? { left: `${left}%`, marginLeft: "-8px" }
                        : { left: `${left + width}%`, marginLeft: "8px" }
                    }
                  >
                    {r.status === "in_progress" && !late ? "underway · " : ""}
                    {fmtRange(r.start!, r.end!)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6">
          <span className="inline-flex items-center gap-2 font-mono text-[9px] tracking-[0.18em] uppercase text-ink/50">
            <span className="inline-block w-4 h-2.5 bg-navy" /> Complete
          </span>
          <span className="inline-flex items-center gap-2 font-mono text-[9px] tracking-[0.18em] uppercase text-ink/50">
            <span className="inline-block w-4 h-2.5 bg-copper" /> In progress
          </span>
          <span className="inline-flex items-center gap-2 font-mono text-[9px] tracking-[0.18em] uppercase text-ink/50">
            <span className="inline-block w-4 h-2.5 border border-ink/30" /> Scheduled
          </span>
          {targetT !== null && (
            <span className="inline-flex items-center gap-2 font-mono text-[9px] tracking-[0.18em] uppercase text-ink/50">
              <span className="inline-block w-px h-3 border-l border-dashed border-ink/40" /> Target completion
            </span>
          )}
        </div>
      </div>

      {unscheduled.length > 0 && (
        <p className="mt-5 text-xs text-ink/45 italic">
          Not yet scheduled:{" "}
          {unscheduled.map((r) => r.title).join(" · ")}
        </p>
      )}
    </div>
  );
}
