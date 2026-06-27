import { buildGanttModel, type GanttMilestone } from "@/lib/schedule/gantt";
import { GanttDependencyLines } from "@/components/schedule/GanttDependencyLines";
import { MILESTONE_STATUS_LABELS } from "@/lib/project/labels";

const ROW_HEIGHT = 46;

type ProjectGanttProps = {
  milestones: GanttMilestone[];
  projectStart?: string | null;
  projectEnd?: string | null;
  dateMode?: "internal" | "client";
  /** Compact hides the editing-oriented density; used on client/share */
  title?: string;
  subtitle?: string;
};

const BAR_TONES: Record<string, { bar: string; fill: string; dot: string }> = {
  completed: {
    bar: "bg-emerald-500/15 border-emerald-500/30",
    fill: "bg-emerald-500",
    dot: "bg-emerald-500",
  },
  in_progress: {
    bar: "bg-copper/15 border-copper/30",
    fill: "bg-copper",
    dot: "bg-copper",
  },
  blocked: {
    bar: "bg-amber-400/15 border-amber-400/40",
    fill: "bg-amber-400",
    dot: "bg-amber-400",
  },
  pending: {
    bar: "bg-ink/[0.04] border-ink/10",
    fill: "bg-stone-400",
    dot: "bg-stone-300",
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
    <section className="relative overflow-hidden border border-ink/10 bg-paper">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-copper/80 via-copper/30 to-transparent" />

      <div className="px-6 md:px-8 pt-7 pb-5 flex flex-wrap items-end justify-between gap-5 border-b border-ink/8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-copper">Progress</p>
          <h3 className="mt-1 font-display text-xl md:text-2xl text-ink tracking-tight">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-ink/55">{subtitle}</p>}
        </div>
        <div className="text-right">
          <div className="font-display text-3xl text-ink leading-none">{model.overallProgress}%</div>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-stone-400">
            {model.completedPhases} of {model.totalPhases} phases complete
          </p>
        </div>
      </div>

      {/* Overall progress meter */}
      <div className="px-6 md:px-8 pt-5">
        <div className="h-2 w-full bg-ink/[0.06] overflow-hidden rounded-full">
          <div
            className="h-full bg-gradient-to-r from-copper-400 to-copper-100 rounded-full transition-all duration-700"
            style={{ width: `${model.overallProgress}%` }}
          />
        </div>
      </div>

      <div className="px-6 md:px-8 py-6 overflow-x-auto">
        <div className="min-w-[680px]">
          {/* Month header */}
          <div className="grid grid-cols-[180px_1fr] gap-4 mb-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-stone-400 self-end">
              Phase
            </div>
            <div className="relative h-5">
              {model.months.map((mo, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 flex items-end"
                  style={{ left: `${mo.left}%`, width: `${mo.width}%` }}
                >
                  <span className="font-mono text-[9px] uppercase tracking-wider text-stone-400 pl-1 border-l border-ink/10 leading-none pb-0.5">
                    {mo.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="relative space-y-2.5">
            <GanttDependencyLines bars={model.bars} rowHeight={ROW_HEIGHT} />
            {/* Month gridlines spanning all rows */}
            <div className="absolute left-[196px] right-0 top-0 bottom-0 pointer-events-none" aria-hidden>
              {model.months.map((mo, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-ink/[0.06]"
                  style={{ left: `${mo.left}%` }}
                />
              ))}
              {model.todayLeft != null && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-copper/60"
                  style={{ left: `${model.todayLeft}%` }}
                >
                  <span className="absolute -top-0.5 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-copper" />
                </div>
              )}
            </div>

            {model.bars.map((bar) => {
              const tone = toneFor(bar.status);
              return (
                <div key={bar.id} className="grid grid-cols-[180px_1fr] gap-4 items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${tone.dot}`} aria-hidden />
                      <span className="text-sm font-medium text-ink truncate">{bar.title}</span>
                    </div>
                    <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-wider text-stone-400 pl-4">
                      {MILESTONE_STATUS_LABELS[bar.status] ?? bar.status}
                    </span>
                  </div>

                  <div className="relative h-9">
                    {bar.hasDates ? (
                      <div
                        className={`absolute top-1 bottom-1 border rounded-md overflow-hidden ${tone.bar}`}
                        style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                        title={`${bar.startLabel ?? ""}${bar.endLabel ? ` → ${bar.endLabel}` : ""}`}
                      >
                        <div
                          className={`absolute inset-y-0 left-0 ${tone.fill} opacity-80`}
                          style={{ width: `${bar.progress}%` }}
                        />
                        <div className="relative h-full flex items-center px-2 gap-2">
                          {bar.startLabel && (
                            <span className="font-mono text-[9px] tracking-wide text-ink/70 whitespace-nowrap">
                              {bar.startLabel}
                              {bar.endLabel ? ` – ${bar.endLabel}` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-y-2 left-0 flex items-center">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-stone-300">
                          Date TBD
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
            <span className={`w-2.5 h-2.5 rounded-full ${l.cls}`} aria-hidden />
            {l.label}
          </span>
        ))}
        {model.todayLeft != null && (
          <span className="flex items-center gap-2 text-xs text-ink/55">
            <span className="w-2.5 h-2.5 rounded-full bg-copper ring-2 ring-copper/30" aria-hidden />
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
