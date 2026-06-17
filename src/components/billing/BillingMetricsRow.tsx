import { HubMetric, ProgressRing } from "@/components/hub/HubUI";
import type { BillingSummary } from "@/lib/billing/summary";
import { formatMoney } from "@/lib/billing/constants";

type BillingMetricsRowProps = {
  summary: BillingSummary;
};

export function BillingMetricsRow({ summary }: BillingMetricsRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[auto_1fr] gap-8 mb-10 items-center">
      <div className="flex justify-center sm:justify-start">
        <ProgressRing
          pct={summary.paidPct}
          size={112}
          label="Collected"
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <HubMetric
          label="Job total"
          value={summary.revisedContract ? formatMoney(summary.revisedContract) : "—"}
          sub={
            summary.changeOrders
              ? `Includes ${formatMoney(summary.changeOrders)} in change orders`
              : "Job total"
          }
        />
        <HubMetric
          label="Billed"
          value={formatMoney(summary.invoiced)}
          sub={`${summary.drawCount} payment${summary.drawCount === 1 ? "" : "s"} planned`}
        />
        <HubMetric
          label="Collected"
          value={formatMoney(summary.paid)}
          sub={`${summary.drawsComplete} of ${summary.drawCount} paid`}
          accent={summary.paid > 0}
        />
        <HubMetric
          label="Still owed"
          value={formatMoney(summary.balance)}
          sub={summary.balance > 0 ? "On the contract" : "All caught up"}
          accent={summary.balance > 0 && summary.invoiced > summary.paid}
        />
      </div>
    </div>
  );
}
