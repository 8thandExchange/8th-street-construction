import { formatMoney } from "@/lib/invoicing/format";
import type { DashboardStats } from "@/lib/invoicing/types";

interface SummaryCardsProps {
  stats: DashboardStats;
}

export function SummaryCards({ stats }: SummaryCardsProps) {
  const cards = [
    {
      label: "Outstanding",
      value: formatMoney(stats.outstanding, stats.currency),
      meta: `${stats.openCount} open invoice${stats.openCount === 1 ? "" : "s"}`,
    },
    {
      label: "Overdue",
      value: formatMoney(stats.overdue, stats.currency),
      meta: stats.overdue > 0 ? "Needs attention" : "All caught up",
    },
    {
      label: "Paid this month",
      value: formatMoney(stats.paidThisMonth, stats.currency),
      meta: `${stats.paidCount} paid total`,
    },
  ];

  return (
    <div className="inv-stat-grid">
      {cards.map((card) => (
        <div key={card.label} className="inv-card inv-stat-card">
          <div className="inv-stat-label">{card.label}</div>
          <div className="inv-stat-value">{card.value}</div>
          <div className="inv-stat-meta">{card.meta}</div>
        </div>
      ))}
    </div>
  );
}
