"use client";

import { useState, useTransition } from "react";
import {
  applyEstimateDraft,
  draftEstimate,
  type EstimateLineDraft,
} from "@/lib/actions/ai-estimate";
import { formatMoney } from "@/lib/billing/constants";

export function CostEstimateGenerator({
  projectId,
  planUrls = [],
}: {
  projectId: string;
  planUrls?: string[];
}) {
  const [draft, setDraft] = useState<{
    lines: EstimateLineDraft[];
    total: number;
    assumptions: string;
  } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [working, start] = useTransition();

  function generate() {
    setMsg(null);
    start(async () => {
      const res = await draftEstimate({ projectId, planUrls });
      if (res.ok) setDraft({ lines: res.lines, total: res.total, assumptions: res.assumptions });
      else setMsg(res.error);
    });
  }

  function apply() {
    if (!draft) return;
    setMsg(null);
    start(async () => {
      const res = await applyEstimateDraft({ projectId, lines: draft.lines });
      if (res.ok) {
        setMsg("Cost plan created from the AI draft. Refine each line as quotes arrive.");
        setDraft(null);
      } else {
        setMsg(res.error ?? "Could not apply.");
      }
    });
  }

  return (
    <section className="border border-copper/30 bg-copper/[0.04] p-6 mb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-copper" aria-hidden>✦</span>
          <h3 className="font-display text-lg text-ink">AI cost plan draft</h3>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={working}
          className="h-10 px-5 bg-ink text-bone font-mono text-[10px] tracking-[0.16em] uppercase hover:bg-copper transition-colors disabled:opacity-50"
        >
          {working ? "Working…" : draft ? "Regenerate" : "Draft with AI"}
        </button>
      </div>
      <p className="text-sm text-ink/55 mt-2 leading-relaxed">
        Ballpark direct costs by division from this project&apos;s size and type
        {planUrls.length ? " and the plan set" : ""}. A starting framework to refine with real bids —
        never a firm number.
      </p>

      {msg && (
        <p className="mt-4 text-xs text-ink/70 bg-bone/70 border border-ink/10 px-3 py-2">{msg}</p>
      )}

      {draft && (
        <div className="mt-5 space-y-4">
          {draft.assumptions && (
            <p className="text-xs text-ink/60 italic border-l-2 border-copper/40 pl-3">
              {draft.assumptions}
            </p>
          )}
          <div className="border border-ink/10 bg-paper divide-y divide-ink/8">
            {draft.lines.map((l) => (
              <div key={l.division_code} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <div className="min-w-0">
                  <span className="text-sm text-ink">{l.trade_label}</span>
                  {l.basis && <span className="block text-xs text-ink/45 truncate">{l.basis}</span>}
                </div>
                <span className="font-mono text-sm text-ink shrink-0">
                  {formatMoney(l.estimated_amount)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 px-4 py-3 bg-bone/40">
              <span className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
                Total direct cost
              </span>
              <span className="font-display text-xl text-ink">{formatMoney(draft.total)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={apply}
              disabled={working}
              className="h-10 px-5 bg-copper text-bone font-mono text-[10px] tracking-[0.16em] uppercase hover:bg-copper-400 transition-colors disabled:opacity-50"
            >
              Create cost plan
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="h-10 px-5 border border-ink/20 font-mono text-[10px] uppercase"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
