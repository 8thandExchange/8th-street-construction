import Link from "next/link";
import { ProgressRing } from "@/components/hub/HubUI";
import { InlineStatusSelect } from "@/components/admin/InlineStatusSelect";

type CommandCenterHeroProps = {
  title: string;
  subtitle?: string;
  progressPct: number;
  progressLabel?: string;
  meta?: React.ReactNode;
  stats: { label: string; value: string | number; accent?: boolean }[];
  actions?: { label: string; href: string; primary?: boolean }[];
  variant?: "admin" | "client";
  /** Admin-only: inline status control */
  statusControl?: {
    value: string;
    options: { value: string; label: string }[];
    styles: Record<string, string>;
    action: (formData: FormData) => Promise<void>;
    hiddenFields: Record<string, string>;
  };
};

export function CommandCenterHero({
  title,
  subtitle,
  progressPct,
  progressLabel = "Complete",
  meta,
  stats,
  actions,
  variant = "admin",
  statusControl,
}: CommandCenterHeroProps) {
  return (
    <section className="app-card relative overflow-hidden mb-8">
      
      <div className="relative px-6 md:px-8 py-8 md:py-10">
        <div className="grid lg:grid-cols-[auto_1fr_auto] gap-8 items-center">
          <ProgressRing pct={progressPct} size={120} label={progressLabel} tone="dark" />

          <div className="min-w-0">
            <p className="app-label !text-copper">
              {variant === "admin" ? "Command center" : "Your project"}
            </p>
            <h2 className="mt-2 app-h1 !text-[24px] md:!text-[28px] leading-tight truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 app-muted text-sm md:text-[15px] max-w-xl">{subtitle}</p>
            )}
            {meta && <div className="mt-3">{meta}</div>}
            {statusControl && (
              <div className="mt-4">
                <InlineStatusSelect
                  value={statusControl.value}
                  options={statusControl.options}
                  styles={statusControl.styles}
                  action={statusControl.action}
                  hiddenFields={statusControl.hiddenFields}
                  size="md"
                  aria-label="Change project status"
                />
              </div>
            )}
          </div>

          {actions && actions.length > 0 && (
            <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end">
              {actions.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  target={a.href.startsWith("http") || a.label.includes("↗") ? "_blank" : undefined}
                  className={
                    a.primary
                      ? "app-btn app-btn-primary"
                      : "app-btn app-btn-secondary"
                  }
                >
                  {a.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`app-inset p-4 ${s.accent ? "hub-metric-accent" : ""}`}
            >
              <p className="text-[10px] font-mono uppercase tracking-wider text-navy/45">{s.label}</p>
              <p className="mt-1 font-display text-xl md:text-2xl text-navy">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
