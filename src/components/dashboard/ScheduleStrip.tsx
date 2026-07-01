import Link from "next/link";
import type { DashboardMilestone } from "@/lib/data/project-dashboard";

const STATUS_DOT: Record<string, string> = {
  completed: "bg-emerald-400 ring-emerald-400/30",
  in_progress: "bg-copper ring-copper/30 animate-pulse",
  blocked: "bg-amber-400 ring-amber-400/30",
  pending: "bg-bone/30 ring-bone/20",
};

type ScheduleStripProps = {
  milestones: DashboardMilestone[];
  href: string;
  title?: string;
  maxItems?: number;
};

export function ScheduleStrip({
  milestones,
  href,
  title = "Build timeline",
  maxItems = 6,
}: ScheduleStripProps) {
  const items = milestones.slice(0, maxItems);
  const activeIdx = items.findIndex((m) => m.status === "in_progress");
  const nextPending = items.findIndex((m) => m.status === "pending");

  return (
    <section className="dash-panel p-6 md:p-8">
      <div className="flex justify-between items-baseline mb-6">
        <h3 className="font-display text-lg text-ink">{title}</h3>
        <Link href={href} className="font-mono text-[10px] uppercase text-copper hover:underline">
          Full schedule →
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-ink/45 italic">
          Timeline phases will appear here once your builder publishes the schedule.
        </p>
      ) : (
        <div className="relative">
          <div className="absolute top-3 left-3 right-3 h-px bg-ink/10 hidden sm:block" aria-hidden />
          <ol className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {items.map((m, i) => {
              const isActive = i === activeIdx || (activeIdx === -1 && i === nextPending);
              return (
                <li key={m.id} className="relative">
                  <Link href={href} className="block group">
                    <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:text-left">
                      <span
                        className={`w-6 h-6 rounded-full ring-4 shrink-0 ${
                          STATUS_DOT[m.status] ?? STATUS_DOT.pending
                        } ${isActive ? "scale-110" : ""} transition-transform`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm leading-snug truncate group-hover:text-copper transition-colors ${
                            isActive ? "font-medium text-ink" : "text-ink/70"
                          }`}
                        >
                          {m.title}
                        </p>
                        {m.target_date && (
                          <p className="text-[10px] font-mono text-stone-300 mt-0.5">
                            {new Date(m.target_date + "T12:00:00").toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
