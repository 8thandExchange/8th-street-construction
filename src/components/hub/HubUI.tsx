import Link from "next/link";

export function HubPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
      <div className="max-w-2xl">
        <h2 className="font-display text-2xl md:text-3xl text-ink tracking-tight">{title}</h2>
        {description && (
          <p className="mt-3 text-ink/60 leading-relaxed text-[15px]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function HubEmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="hub-panel text-center py-16 px-8">
      <p className="font-display text-xl text-ink/80">{title}</p>
      <p className="mt-3 text-sm text-ink/50 max-w-md mx-auto leading-relaxed">{description}</p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="app-btn app-btn-primary mt-8"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export type HubAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail?: string;
  href?: string;
  actionLabel?: string;
};

export function HubAlertStrip({ alerts }: { alerts: HubAlert[] }) {
  if (!alerts.length) return null;

  const styles = {
    critical: "border-red-200/70 bg-red-50 text-red-900",
    warning: "border-amber-200/70 bg-amber-50 text-amber-950",
    info: "border-navy/10 bg-white text-navy/80",
  };

  return (
    <div className="space-y-2 mb-10">
      {alerts.map((a) => (
        <div
          key={a.id}
          className={`flex flex-wrap items-center justify-between gap-4 rounded-[10px] border px-5 py-3.5 shadow-sm ${styles[a.severity]}`}
        >
          <div>
            <div className="text-sm font-medium">{a.title}</div>
            {a.detail && <div className="text-xs mt-0.5 opacity-75">{a.detail}</div>}
          </div>
          {a.href && a.actionLabel && (
            <Link
              href={a.href}
              className="shrink-0 font-mono text-[10px] tracking-[0.15em] uppercase hover:underline"
            >
              {a.actionLabel} →
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

export function ProgressRing({
  pct,
  size = 120,
  label,
  tone = "dark",
}: {
  pct: number;
  size?: number;
  label?: string;
  tone?: "dark" | "light";
}) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const track = tone === "light" ? "rgba(245,240,232,0.15)" : "rgba(10,15,20,0.08)";
  const text = tone === "light" ? "text-bone" : "text-ink";
  const sub = tone === "light" ? "text-bone/50" : "text-stone-300";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={track}
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(181,69,27)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`app-num text-xl font-medium ${text}`}>{pct}%</span>
        {label && (
          <span className={`text-[9px] font-mono uppercase tracking-wider ${sub} mt-0.5`}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

export function HubMetric({
  label,
  value,
  sub,
  href,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
  accent?: boolean;
}) {
  const inner = (
    <div className={`hub-metric app-card-hover ${accent ? "hub-metric-accent" : ""} h-full p-5`}>
      <div className="app-label">{label}</div>
      <div className="app-num text-[24px] font-medium text-navy mt-3 leading-none">{value}</div>
      {sub && <div className="app-muted text-xs mt-2">{sub}</div>}
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

export function HubActionRow({
  items,
}: {
  items: { href: string; label: string; hint?: string }[];
}) {
  return (
    <ul className="app-card divide-y divide-navy/[0.06] overflow-hidden">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-navy/[0.025] transition-colors group"
          >
            <div>
              <span className="text-sm text-ink group-hover:text-copper transition-colors">
                {item.label}
              </span>
              {item.hint && (
                <span className="block text-xs text-stone-300 mt-0.5">{item.hint}</span>
              )}
            </div>
            <span className="text-stone-300 group-hover:text-copper transition-colors">→</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
