import { buildGanttModel, type GanttMilestone } from "@/lib/schedule/gantt";
import { GanttDependencyLines } from "@/components/schedule/GanttDependencyLines";
import { MILESTONE_STATUS_LABELS } from "@/lib/project/labels";

const ROW_HEIGHT = 44;
const LABEL_COL_PX = 264;

type ProjectGanttProps = {
  milestones: GanttMilestone[];
  projectStart?: string | null;
  projectEnd?: string | null;
  dateMode?: "internal" | "client";
  /** Compact hides the editing-oriented density; used on client/share */
  title?: string;
  subtitle?: string;
};

/** Buildertrend-style solid bars: light track for the planned window, solid fill for completion. */
const BAR_TONES: Record<string, { track: string; fill: string; dot: string; ring: string }> = {
  completed: {
    track: "bg-emerald-500/25",
    fill: "bg-emerald-500",
    dot: "bg-emerald-500",
    ring: "ring-emerald-600/20",
  },
  in_progress: {
    track: "bg-copper/20",
    fill: "bg-copper",
    dot: "bg-copper",
    ring: "ring-copper/25",
  },
  blocked: {
    track: "bg-amber-400/25",
    fill: "bg-amber-400",
    dot: "bg-amber-400",
    ring: "ring-amber-500/25",
  },
  pending: {
    track: "bg-stone-300/50",
    fill: "bg-stone-400",
    dot: "bg-stone-300",
    ring: "ring-stone-400/20",
  },
};

function toneFor(status: string) {
  return BAR_TONES[status] ?? BAR_TONES.pending;
}

export function ProjectGantt({
  milestones,
  projectStart,
  projectEnd,
  dateMode = "internal",
  title = "Build schedule",
  subtitle,
}: ProjectGanttProps) {
  const model = buildGanttModel(milestones, { projectStart, projectEnd, dateMode });

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
    <section className="relative isolate overflow-hidden border border-ink/10 bg-white">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-copper via-copper/40 to-transparent" />

      <div className="px-6 md:px-8 pt-7 pb-5 flex flex-wrap items-end justify-between gap-5 border-b border-ink/8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-copper">Progress</p>
          <h3 className="mt-1 font-display text-xl md:text-2xl text-ink tracking-tight">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-ink/55">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-wider text-stone-400">Timeline</p>
            <p className="mt-0.5 text-sm font-medium text-ink whitespace-nowrap">
              {model.rangeStartLabel} — {model.rangeEndLabel}
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl text-ink leading-none">
              {model.overallProgress}%
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-stone-400">
              {model.completedPhases} of {model.totalPhases} phases complete
            </p>
          </div>
        </div>
      </div>

      {/* Overall progress meter */}
      <div className="px-6 md:px-8 pt-5 pb-1">
        <div className="h-1.5 w-full bg-ink/[0.06] overflow-hidden rounded-full">
          <div
            className="h-full bg-copper rounded-full transition-all duration-700"
            style={{ width: `${model.overallProgress}%` }}
          />
        </div>
      </div>

      <div className="pt-4 overflow-x-auto">
        <div className="min-w-[760px]">
          {/* Time axis: months on top, week ticks under them */}
          <div className="flex border-b border-ink/10">
            <div
              className="shrink-0 border-r border-ink/10 px-6 md:px-8 flex items-end pb-1.5"
              style={{ width: LABEL_COL_PX }}
            >
              <span className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
                Phase
              </span>
            </div>
            <div className="relative flex-1 h-11">
              {model.months.map((mo, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-6 border-l border-ink/10 flex items-center overflow-hidden"
                  style={{ left: `${mo.left}%`, width: `${mo.width}%` }}
                >
                  <span className="w-full text-center font-mono text-[9px] uppercase tracking-wider text-ink/60 whitespace-nowrap">
                    {mo.label}
                  </span>
                </div>
              ))}
              {model.weeks.map((wk, i) => (
                <div
                  key={i}
                  className="absolute bottom-0 h-5 border-l border-ink/[0.07] pl-0.5 flex items-center"
                  style={{ left: `${wk.left}%` }}
                >
                  <span className="font-mono text-[8px] text-stone-400">{wk.label}</span>
                </div>
              ))}
              {model.todayLeft != null && (
                <span
                  className="absolute bottom-0 translate-x-[-50%] rounded-sm bg-rust px-1 py-px font-mono text-[8px] font-semibold uppercase tracking-wide text-white z-10"
                  style={{ left: `${model.todayLeft}%` }}
                >
                  Today
                </span>
              )}
            </div>
          </div>

          {/* Rows */}
          <div className="flex">
            {/* Left data pane */}
            <div className="shrink-0 border-r border-ink/10" style={{ width: LABEL_COL_PX }}>
              {model.bars.map((bar, idx) => {
                const tone = toneFor(bar.status);
                return (
                  <div
                    key={bar.id}
                    className={`px-6 md:px-8 flex flex-col justify-center border-b border-ink/[0.06] ${
                      idx % 2 ? "bg-ink/[0.015]" : ""
                    }`}
                    style={{ height: ROW_HEIGHT }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${tone.dot}`} aria-hidden />
                      <span
                        className="text-[13px] font-medium text-ink truncate"
                        title={`${bar.title} — ${MILESTONE_STATUS_LABELS[bar.status] ?? bar.status}`}
                      >
                        {bar.title}
                      </span>
                    </div>
                    <span className="mt-0.5 pl-4 font-mono text-[9px] tracking-wide text-stone-400 whitespace-nowrap">
                      {bar.hasDates ? (
                        <>
                          {bar.startLabel}
                          {bar.endLabel ? ` – ${bar.endLabel}` : ""}
                          {bar.durationDays ? ` · ${bar.durationDays}d` : ""}
                          {bar.progress > 0 ? ` · ${bar.progress}%` : ""}
                        </>
                      ) : (
                        "Date TBD"
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Timeline pane */}
            <div className="relative flex-1">
              {/* Gridlines spanning all rows */}
              <div className="absolute inset-0 pointer-events-none" aria-hidden>
                {model.weeks.map((wk, i) => (
                  <div
                    key={`w${i}`}
                    className="absolute top-0 bottom-0 border-l border-ink/[0.04]"
                    style={{ left: `${wk.left}%` }}
                  />
                ))}
                {model.months.map((mo, i) => (
                  <div
                    key={`m${i}`}
                    className="absolute top-0 bottom-0 border-l border-ink/10"
                    style={{ left: `${mo.left}%` }}
                  />
                ))}
              </div>

              <GanttDependencyLines bars={model.bars} rowHeight={ROW_HEIGHT} />

              {model.bars.map((bar, idx) => {
                const tone = toneFor(bar.status);
                const showPct =
                  bar.hasDates && bar.progress > 0 && bar.progress < 100 && bar.width >= 9;
                return (
                  <div
                    key={bar.id}
                    className={`relative border-b border-ink/[0.06] ${
                      idx % 2 ? "bg-ink/[0.015]" : ""
                    }`}
                    style={{ height: ROW_HEIGHT }}
                  >
                    {bar.hasDates ? (
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 h-[22px] rounded-[5px] overflow-hidden ring-1 ring-inset ${tone.ring} ${tone.track}`}
                        style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                        title={`${bar.title}: ${bar.startLabel ?? ""}${
                          bar.endLabel ? ` → ${bar.endLabel}` : ""
                        }${bar.durationDays ? ` (${bar.durationDays} days)` : ""} · ${
                          bar.progress
                        }% complete`}
                      >
                        <div
                          className={`absolute inset-y-0 left-0 ${tone.fill}`}
                          style={{ width: `${bar.progress}%` }}
                        />
                        {showPct && (
                          <div className="relative h-full flex items-center justify-end pr-1.5">
                            <span className="font-mono text-[9px] font-semibold text-ink/60">
                              {bar.progress}%
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="absolute inset-y-0 left-2 flex items-center">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-stone-300">
                          Date TBD
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Today line above bars */}
              {model.todayLeft != null && (
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-rust/80 pointer-events-none z-10"
                  style={{ left: `${model.todayLeft}%` }}
                  aria-hidden
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 md:px-8 py-4 border-t border-ink/8 flex flex-wrap items-center gap-x-6 gap-y-2">
        {[
          { label: "Complete", cls: "bg-emerald-500" },
          { label: "In progress", cls: "bg-copper" },
          { label: "Blocked", cls: "bg-amber-400" },
          { label: "Upcoming", cls: "bg-stone-300" },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-2 text-xs text-ink/55">
            <span className={`w-3.5 h-2.5 rounded-[3px] ${l.cls}`} aria-hidden />
            {l.label}
          </span>
        ))}
        {model.todayLeft != null && (
          <span className="flex items-center gap-2 text-xs text-ink/55">
            <span className="w-[2px] h-3 bg-rust/80" aria-hidden />
            Today
          </span>
        )}
        {model.bars.some((bar) => bar.predecessor_id) && (
          <span className="flex items-center gap-2 text-xs text-ink/55">
            <span className="w-4 h-0.5 bg-ink/25" aria-hidden />
            Dependency
          </span>
        )}
      </div>
    </section>
  );
}
