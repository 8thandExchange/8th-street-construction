export type BidLevelingStats = {
  count: number;
  low: number;
  high: number;
  average: number;
  spreadPct: number;
};

export function bidLevelingStats(amounts: number[]): BidLevelingStats {
  const priced = amounts.filter((n) => Number.isFinite(n) && n > 0);
  if (priced.length === 0) {
    return { count: 0, low: 0, high: 0, average: 0, spreadPct: 0 };
  }
  const low = Math.min(...priced);
  const high = Math.max(...priced);
  const average = priced.reduce((sum, n) => sum + n, 0) / priced.length;
  return {
    count: priced.length,
    low,
    high,
    average: Math.round(average),
    spreadPct: low > 0 ? Math.round(((high - low) / low) * 100) : 0,
  };
}

/** Prefer an explicit company match, then a "normal" flag closest to average. */
export function matchRecommendedBidId(
  bids: { id: string; company: string; amount: number }[],
  analysis: { recommendation: string; bids: { company: string; flag: string }[] }
): string | null {
  if (!bids.length) return null;
  const byCompany = new Map(bids.map((b) => [b.company.trim().toLowerCase(), b.id]));
  const mentioned = analysis.recommendation.toLowerCase();
  for (const bid of bids) {
    const name = bid.company.trim();
    if (name && mentioned.includes(name.toLowerCase())) return bid.id;
  }
  const preferredCompany = analysis.bids.find((b) => b.flag === "normal")?.company;
  if (preferredCompany) {
    const id = byCompany.get(preferredCompany.trim().toLowerCase());
    if (id) return id;
  }
  const avg = bids.reduce((sum, b) => sum + b.amount, 0) / bids.length;
  return [...bids].sort((a, b) => Math.abs(a.amount - avg) - Math.abs(b.amount - avg))[0]?.id ?? null;
}
