import Link from "next/link";
import {
  activityKindLabel,
  type DashboardActivity,
  type ActivityKind,
} from "@/lib/data/project-dashboard";

const KIND_ICONS: Record<ActivityKind, string> = {
  update: "📸",
  field_note: "📝",
  message: "💬",
  milestone: "✓",
  invoice: "$",
  change_order: "±",
  selection: "◆",
  document: "📄",
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type ActivityFeedProps = {
  activities: DashboardActivity[];
  title?: string;
  emptyMessage?: string;
  viewAllHref?: string;
};

export function ActivityFeed({
  activities,
  title = "Recent activity",
  emptyMessage = "Activity from the field, billing, and client portal will show here.",
  viewAllHref,
}: ActivityFeedProps) {
  return (
    <section className="dash-panel flex flex-col h-full">
      <div className="flex justify-between items-baseline px-6 pt-6 pb-4 border-b border-ink/8">
        <h3 className="font-display text-lg text-ink">{title}</h3>
        {viewAllHref && (
          <Link href={viewAllHref} className="font-mono text-[10px] uppercase text-copper hover:underline">
            View all →
          </Link>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-sm text-ink/45 italic text-center max-w-xs">{emptyMessage}</p>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-ink/6 overflow-hidden">
          {activities.map((a) => {
            const row = (
              <>
                <span
                  className="shrink-0 w-8 h-8 flex items-center justify-center bg-bone border border-ink/10 text-sm font-mono"
                  aria-hidden
                >
                  {KIND_ICONS[a.kind]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-ink truncate group-hover:text-copper transition-colors">
                      {a.title}
                    </p>
                    <time className="shrink-0 text-[10px] font-mono text-stone-300 tabular-nums">
                      {formatRelativeTime(a.at)}
                    </time>
                  </div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-stone-300 mt-0.5">
                    {activityKindLabel(a.kind)}
                    {a.detail ? ` · ${a.detail}` : ""}
                  </p>
                </div>
              </>
            );

            return (
              <li key={a.id}>
                {a.href ? (
                  <Link
                    href={a.href}
                    className="flex items-start gap-4 px-6 py-4 hover:bg-bone/50 transition-colors group"
                  >
                    {row}
                  </Link>
                ) : (
                  <div className="flex items-start gap-4 px-6 py-4">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
