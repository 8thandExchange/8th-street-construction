import Link from "next/link";
import type { DashboardAction } from "@/lib/data/project-dashboard";

const SEVERITY_STYLES = {
  critical: {
    border: "border-red-200/80",
    bg: "bg-red-50/60",
    dot: "bg-red-500",
    label: "text-red-900",
  },
  warning: {
    border: "border-amber-200/80",
    bg: "bg-amber-50/60",
    dot: "bg-amber-500",
    label: "text-amber-950",
  },
  info: {
    border: "border-copper/25",
    bg: "bg-copper/5",
    dot: "bg-copper",
    label: "text-ink",
  },
} as const;

type ActionQueueProps = {
  actions: DashboardAction[];
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function ActionQueue({
  actions,
  title = "Your turn",
  emptyTitle = "All caught up",
  emptyDescription = "Nothing needs your attention right now. We'll notify you when something comes up.",
}: ActionQueueProps) {
  if (actions.length === 0) {
    return (
      <section className="dash-panel p-6 md:p-8 border-emerald-200/60 bg-emerald-50/30">
        <div className="flex items-start gap-4">
          <span className="w-10 h-10 flex items-center justify-center bg-emerald-100 text-emerald-700 font-display text-xl shrink-0">
            ✓
          </span>
          <div>
            <h3 className="font-display text-lg text-ink">{emptyTitle}</h3>
            <p className="mt-1 text-sm text-ink/55 leading-relaxed">{emptyDescription}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="dash-panel overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-ink/8">
        <h3 className="font-display text-lg text-ink">{title}</h3>
        <p className="text-xs text-ink/50 mt-1">
          {actions.length} item{actions.length > 1 ? "s" : ""} need attention
        </p>
      </div>
      <ul className="divide-y divide-ink/6">
        {actions.map((action) => {
          const styles = SEVERITY_STYLES[action.severity];
          return (
            <li key={action.id}>
              <Link
                href={action.href}
                className={`flex items-center gap-4 px-6 py-4 transition-colors hover:bg-bone/50 group ${styles.bg}`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${styles.dot}`} aria-hidden />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${styles.label} group-hover:text-copper transition-colors`}>
                    {action.label}
                  </p>
                  {action.hint && (
                    <p className="text-xs text-ink/45 mt-0.5 font-mono">{action.hint}</p>
                  )}
                </div>
                <span className="shrink-0 font-mono text-[10px] uppercase text-copper opacity-0 group-hover:opacity-100 transition-opacity">
                  Go →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
