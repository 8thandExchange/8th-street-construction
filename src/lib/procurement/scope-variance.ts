export type ScopeVarianceRow = {
  templateId: string;
  trade: string;
  title: string;
  budget: number;
  awarded: number;
  variance: number;
  variancePct: number;
};

export function scopeVariances(
  rows: {
    templateId: string;
    trade: string;
    title: string;
    budget: number | null;
    awarded: number;
  }[],
  thresholdPct = 10
): ScopeVarianceRow[] {
  return rows
    .filter((row) => row.budget != null && row.budget > 0 && Number.isFinite(row.awarded))
    .map((row) => {
      const budget = Number(row.budget);
      const awarded = Number(row.awarded);
      const variance = Math.round((awarded - budget) * 100) / 100;
      return {
        templateId: row.templateId,
        trade: row.trade,
        title: row.title,
        budget,
        awarded,
        variance,
        variancePct: Math.round((variance / budget) * 1000) / 10,
      };
    })
    .filter((row) => Math.abs(row.variancePct) >= thresholdPct)
    .sort((a, b) => Math.abs(b.variancePct) - Math.abs(a.variancePct));
}
