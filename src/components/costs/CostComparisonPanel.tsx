import Link from "next/link";
import { formatMoney } from "@/lib/billing/constants";
import type { ProjectCostSummary } from "@/lib/estimate/summary";
import { formatCostDelta } from "@/lib/estimate/summary";

type CostComparisonPanelProps = {
  projectId: string;
  summary: ProjectCostSummary;
  compact?: boolean;
};

export function CostComparisonPanel({ projectId, summary, compact }: CostComparisonPanelProps) {
  const cols = [
    {
      label: "Our cost plan",
      sub: "What we think it costs to build",
      value: summary.estimatedCost,
      href: `/admin/projects/${projectId}/costs`,
      accent: !summary.estimatedCost,
    },
    {
      label: "Sub quotes in",
      sub:
        summary.linesWithBids > 0
          ? `${summary.linesWithBids} trades priced`
          : "Quotes from subs — enter as they come back",
      value: summary.awardedBids,
      href: `/admin/projects/${projectId}/bid-requests`,
      accent: summary.awardedBids > 0 && summary.awardedBids > summary.estimatedCost,
    },
    {
      label: "Client billing",
      sub: "What we bill Habitat or the homeowner",
      value: summary.clientContract,
      href: `/admin/projects/${projectId}/billing`,
      accent: !summary.clientContract,
    },
  ];

  if (compact) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cols.map((c) => (
          <Link key={c.label} href={c.href} className="hub-metric block hover:border-copper/40">
            <div className="eyebrow">{c.label}</div>
            <div className="font-display text-xl text-ink mt-2">
              {c.value ? formatMoney(c.value) : "—"}
            </div>
            <div className="text-[10px] text-ink/45 mt-1 leading-relaxed">{c.sub}</div>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <section className="mb-12">
      <div className="mb-6">
        <h3 className="font-display text-xl text-ink">Three money buckets</h3>
        <p className="mt-1 text-sm text-ink/55 leading-relaxed max-w-2xl">
          These stay separate on purpose. Your cost plan gets smarter as quotes come in. Client
          billing is whatever Habitat or the homeowner agreed to pay you.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cols.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`hub-panel p-6 block transition-colors hover:border-copper/40 ${
              c.accent ? "border-copper/30" : ""
            }`}
          >
            <p className="eyebrow">{c.label}</p>
            <p className="font-display text-3xl text-ink mt-3">
              {c.value ? formatMoney(c.value) : "Not set"}
            </p>
            <p className="text-sm text-ink/55 mt-2 leading-relaxed">{c.sub}</p>
          </Link>
        ))}
      </div>
      {summary.estimatedCost > 0 && summary.awardedBids > 0 && (
        <p className="mt-4 text-sm text-ink/55">
          Quotes vs our plan:{" "}
          <span
            className={
              summary.estimateVsAwarded < 0 ? "text-red-700 font-medium" : "text-emerald-700 font-medium"
            }
          >
            {formatCostDelta(summary.estimateVsAwarded)}
          </span>
          {summary.clientContract > 0 && (
            <>
              {" "}
              · Client pays us{" "}
              <span className="text-ink font-medium">{formatCostDelta(summary.clientVsEstimate)}</span>{" "}
              vs our cost plan
            </>
          )}
        </p>
      )}
    </section>
  );
}
