import { formatMoney } from "@/lib/billing/constants";

export type EstimateLineRow = {
  id: string;
  division_code: string;
  trade_label: string;
  description: string | null;
  estimated_amount: number;
  awarded_amount: number | null;
  bid_request_id: string | null;
};

export type ProjectCostSummary = {
  estimatedCost: number;
  awardedBids: number;
  clientContract: number;
  estimateVsAwarded: number;
  clientVsEstimate: number;
  linesWithBids: number;
  lineCount: number;
};

export function computeProjectCostSummary(
  estimatedCost: number,
  clientContract: number,
  lines: EstimateLineRow[],
  fallbackAwardedFromBids?: number
): ProjectCostSummary {
  const awardedFromLines = lines.reduce((s, l) => s + Number(l.awarded_amount ?? 0), 0);
  const awardedBids = awardedFromLines > 0 ? awardedFromLines : (fallbackAwardedFromBids ?? 0);

  return {
    estimatedCost,
    awardedBids,
    clientContract,
    estimateVsAwarded: estimatedCost - awardedBids,
    clientVsEstimate: clientContract - estimatedCost,
    linesWithBids: lines.filter((l) => l.awarded_amount != null && l.awarded_amount > 0).length,
    lineCount: lines.length,
  };
}

export function formatCostDelta(amount: number): string {
  if (amount === 0) return "On target";
  const prefix = amount > 0 ? "+" : "";
  return `${prefix}${formatMoney(amount)}`;
}
