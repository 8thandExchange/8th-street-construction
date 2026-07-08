import type { ScheduleHealth } from "@/lib/schedule/health";

const STATE_META: Record<
  ScheduleHealth["state"],
  { label: string; chip: string; dot: string }
> = {
  on_track: {
    label: "On track",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  watch: {
    label: "Needs attention",
    chip: "border-amber-200 bg-amber-50 text-amber-800",
    dot: "bg-amber-400",
  },
  behind: {
    label: "Behind schedule",
    chip: "border-rust/30 bg-rust/10 text-rust",
    dot: "bg-rust",
  },
  complete: {
    label: "All phases complete",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  unscheduled: {
    label: "Dates coming soon",
    chip: "border-stone-200 bg-stone-100 text-stone-500",
    dot: "bg-stone-300",
  },
};

function healthDetail(health: ScheduleHealth): string | null {
  if (health.state === "complete") return null;
  if (health.state === "unscheduled")
    return "Phase dates will appear here as the build plan is finalized.";
  const late = health.latePhases[0];
  if (late) {
    const others = health.latePhases.length - 1;
    return `${late.title} is ${late.daysLate} day${late.daysLate === 1 ? "" : "s"} past its target${
      others > 0 ? ` (+${others} more phase${others === 1 ? "" : "s"})` : ""
    }.`;
  }
  if (health.blockedCount > 0)
    return `${health.blockedCount} phase${health.blockedCount === 1 ? " is" : "s are"} waiting on something before work can continue.`;
  if (health.current) return `${health.current.title} is underway.`;
  return null;
}

/** One-glance schedule verdict: on track / behind, what's underway, what's next. */
export function ScheduleHealthBanner({ health }: { health: ScheduleHealth }) {
  const meta = STATE_META[health.state];
  const detail = healthDetail(health);

  return (
    <div className="hub-panel px-5 py-4 md:px-6 flex flex-wrap items-center gap-x-6 gap-y-3">
      <span
        className={`inline-flex items-center gap-2 border px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] ${meta.chip}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} aria-hidden />
        {meta.label}
      </span>
      {detail && <p className="text-sm text-ink/65 leading-relaxed">{detail}</p>}
      {health.nextUp && (
        <p className="text-sm text-ink/65 leading-relaxed">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-copper mr-2">
            Up next
          </span>
          {health.nextUp.title} — {health.nextUp.dateLabel} (in {health.nextUp.daysUntil}{" "}
          day{health.nextUp.daysUntil === 1 ? "" : "s"})
        </p>
      )}
    </div>
  );
}
