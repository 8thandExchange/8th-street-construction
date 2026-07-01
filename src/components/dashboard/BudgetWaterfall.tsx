import Link from "next/link";
import { formatMoney } from "@/lib/billing/constants";
import type { ProjectCostSummary } from "@/lib/estimate/summary";
import type { BillingSummary } from "@/lib/billing/summary";

type BudgetWaterfallProps = {
  projectId: string;
  cost: ProjectCostSummary;
  billing: BillingSummary;
  variant?: "admin" | "client";
};

type BarSegment = {
  key: string;
  label: string;
  value: number;
  href?: string;
  color: string;
  trackColor: string;
};

function barWidth(value: number, max: number): number {
  if (!max || !value) return 0;
  return Math.max(4, Math.round((value / max) * 100));
}

export function BudgetWaterfall({ projectId, cost, billing, variant = "admin" }: BudgetWaterfallProps) {
  const base = variant === "admin" ? `/admin/projects/${projectId}` : `/client/projects/${projectId}`;

  const segments: BarSegment[] =
    variant === "admin"
      ? [
          {
            key: "estimate",
            label: "Our cost plan",
            value: cost.estimatedCost,
            href: `${base}/costs`,
            color: "bg-stone-400",
            trackColor: "bg-stone-400/20",
          },
          {
            key: "awarded",
            label: "Sub quotes in",
            value: cost.awardedBids,
            href: `${base}/bid-requests`,
            color: "bg-sky-600",
            trackColor: "bg-sky-600/15",
          },
          {
            key: "contract",
            label: "Client billing",
            value: billing.revisedContract || cost.clientContract,
            href: `${base}/billing`,
            color: "bg-ink",
            trackColor: "bg-ink/10",
          },
          {
            key: "collected",
            label: "Collected",
            value: billing.paid,
            href: `${base}/billing`,
            color: "bg-emerald-600",
            trackColor: "bg-emerald-600/15",
          },
        ]
      : [
          {
            key: "contract",
            label: "Job total",
            value: billing.revisedContract,
            href: `${base}/billing`,
            color: "bg-ink",
            trackColor: "bg-ink/10",
          },
          {
            key: "invoiced",
            label: "Invoiced",
            value: billing.invoiced,
            href: `${base}/billing`,
            color: "bg-copper",
            trackColor: "bg-copper/15",
          },
          {
            key: "collected",
            label: "Paid",
            value: billing.paid,
            href: `${base}/billing`,
            color: "bg-emerald-600",
            trackColor: "bg-emerald-600/15",
          },
        ];

  const maxValue = Math.max(...segments.map((s) => s.value), 1);

  if (variant === "client" && billing.revisedContract <= 0) {
    return null;
  }

  return (
    <section className="dash-panel p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h3 className="font-display text-xl text-ink">
            {variant === "admin" ? "Money flow" : "Payment progress"}
          </h3>
          <p className="mt-1 text-sm text-ink/55 max-w-lg">
            {variant === "admin"
              ? "Estimate → quotes → billing → collected. Each bucket stays separate on purpose."
              : "Your contract, what's been invoiced, and what's been paid."}
          </p>
        </div>
        {billing.revisedContract > 0 && (
          <div className="text-right">
            <p className="text-[10px] font-mono uppercase tracking-wider text-stone-300">Collected</p>
            <p className="font-display text-2xl text-emerald-700">{billing.paidPct}%</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {segments.map((seg) => {
          const width = barWidth(seg.value, maxValue);
          const inner = (
            <div className="group">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-stone-300 group-hover:text-ink transition-colors">
                  {seg.label}
                </span>
                <span className="font-display text-lg text-ink">
                  {seg.value ? formatMoney(seg.value) : "—"}
                </span>
              </div>
              <div className={`h-2.5 ${seg.trackColor} overflow-hidden`}>
                <div
                  className={`h-full ${seg.color} transition-all duration-700 ease-out`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );

          if (seg.href) {
            return (
              <Link key={seg.key} href={seg.href} className="block hover:opacity-90 transition-opacity">
                {inner}
              </Link>
            );
          }
          return <div key={seg.key}>{inner}</div>;
        })}
      </div>
    </section>
  );
}
