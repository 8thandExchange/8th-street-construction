"use client";

import { useState, useTransition } from "react";
import { levelBids, type BidLevelingResult } from "@/lib/actions/ai-bid-leveling";
import { formatMoney } from "@/lib/billing/constants";

const FLAG_STYLES: Record<string, string> = {
  low: "bg-amber-50 text-amber-800 border-amber-200",
  high: "bg-violet-50 text-violet-700 border-violet-200",
  normal: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function BidLeveling({ bidRequestId, bidCount }: { bidRequestId: string; bidCount: number }) {
  const [analysis, setAnalysis] = useState<BidLevelingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, start] = useTransition();

  if (bidCount < 2) return null;

  function run() {
    setError(null);
    start(async () => {
      const res = await levelBids(bidRequestId);
      if (res.ok) setAnalysis(res.analysis);
      else setError(res.error);
    });
  }

  return (
    <div className="mt-5 pt-4 border-t border-ink/8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
          Bid leveling
        </span>
        <button
          type="button"
          onClick={run}
          disabled={working}
          className="inline-flex items-center gap-2 h-9 px-4 border border-copper/40 bg-paper text-copper font-mono text-[10px] tracking-[0.16em] uppercase hover:bg-copper hover:text-bone transition-colors disabled:opacity-50"
        >
          <span aria-hidden>✦</span>
          {working ? "Analyzing…" : analysis ? "Re-run" : "Level with AI"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2">
          {error}
        </p>
      )}

      {analysis && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Low", value: formatMoney(analysis.stats.low) },
              { label: "Average", value: formatMoney(analysis.stats.average) },
              { label: "High", value: formatMoney(analysis.stats.high) },
              { label: "Spread", value: `${analysis.stats.spreadPct}%` },
            ].map((s) => (
              <div key={s.label} className="border border-ink/10 bg-bone/40 px-3 py-2">
                <div className="font-mono text-[9px] uppercase tracking-wider text-stone-400">
                  {s.label}
                </div>
                <div className="font-display text-lg text-ink">{s.value}</div>
              </div>
            ))}
          </div>

          <p className="text-sm text-ink/75 leading-relaxed">{analysis.summary}</p>

          <ul className="space-y-2">
            {analysis.bids.map((b, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-3 border border-ink/10 bg-paper px-3 py-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border ${
                      FLAG_STYLES[b.flag] ?? FLAG_STYLES.normal
                    }`}
                  >
                    {b.flag}
                  </span>
                  <span className="text-sm text-ink truncate">{b.company}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono text-stone-400">
                    {b.vsAveragePct > 0 ? "+" : ""}
                    {b.vsAveragePct}% vs avg
                  </span>
                  <span className="font-mono text-sm text-ink">{formatMoney(b.amount)}</span>
                </div>
                {b.note && <p className="w-full text-xs text-ink/55 leading-relaxed">{b.note}</p>}
              </li>
            ))}
          </ul>

          <div className="border-l-2 border-copper pl-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-copper mb-1">
              Recommendation
            </p>
            <p className="text-sm text-ink/80 leading-relaxed">{analysis.recommendation}</p>
          </div>

          <p className="text-[11px] text-ink/40">
            AI guidance for review — confirm scope with subs before awarding.
          </p>
        </div>
      )}
    </div>
  );
}
