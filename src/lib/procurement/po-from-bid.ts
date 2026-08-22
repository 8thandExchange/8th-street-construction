export type AwardedBidPoLine = {
  description: string;
  quantity: number;
  unit_amount: number;
  cost_division: string | null;
  estimate_line_id: string | null;
};

export function purchaseOrderLineFromAwardedBid(input: {
  title: string;
  trade?: string | null;
  amount: number;
  divisionCode?: string | null;
  estimateLineId?: string | null;
}): AwardedBidPoLine {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Awarded bid needs a positive amount");
  }
  return {
    description: `${input.title}${input.trade ? ` (${input.trade})` : ""} — per awarded bid`,
    quantity: 1,
    unit_amount: amount,
    cost_division: input.divisionCode?.trim() || null,
    estimate_line_id: input.estimateLineId?.trim() || null,
  };
}

export function poBillCoverage(poTotal: number, billedAmounts: number[]) {
  const billed = billedAmounts.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);
  const committed = Number.isFinite(poTotal) ? poTotal : 0;
  return {
    committed,
    billed,
    remaining: Math.max(0, Math.round((committed - billed) * 100) / 100),
    over: Math.max(0, Math.round((billed - committed) * 100) / 100),
  };
}
