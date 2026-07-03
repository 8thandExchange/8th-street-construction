"use client";

import { useState, useTransition } from "react";
import {
  applyScheduleDraft,
  draftSchedule,
  shiftScheduleFrom,
  type ScheduledPhase,
} from "@/lib/actions/ai-schedule";

function fmt(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function AiScheduleGenerator({
  projectId,
  defaultStart,
  defaultEnd,
}: {
  projectId: string;
  defaultStart: string | null;
  defaultEnd: string | null;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(defaultStart || today);
  const [targetEnd, setTargetEnd] = useState(defaultEnd || "");
  const [phases, setPhases] = useState<ScheduledPhase[] | null>(null);
  const [setTargets, setSetTargets] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [working, start] = useTransition();

  // Slip controls
  const [slipFrom, setSlipFrom] = useState(today);
  const [slipDays, setSlipDays] = useState(7);

  function generate() {
    setMsg(null);
    start(async () => {
      const res = await draftSchedule({ projectId, startDate, targetEndDate: targetEnd || undefined });
      if (res.ok) setPhases(res.phases);
      else setMsg(res.error);
    });
  }

  function apply() {
    if (!phases) return;
    setMsg(null);
    start(async () => {
      const res = await applyScheduleDraft({
        projectId,
        phases: phases.map((p) => ({
          milestoneId: p.milestoneId,
          scheduled_start: p.scheduled_start,
          scheduled_end: p.scheduled_end,
        })),
        setTargetDates: setTargets,
      });
      if (res.ok) {
        setMsg("Schedule applied. The Gantt above is updated.");
        setPhases(null);
      } else {
        setMsg(res.error ?? "Could not apply.");
      }
    });
  }

  function slip() {
    setMsg(null);
    start(async () => {
      const res = await shiftScheduleFrom({ projectId, fromDate: slipFrom, days: Number(slipDays) });
      if (res.ok) setMsg(`Shifted ${res.shifted} phase(s) by ${slipDays} day(s).`);
      else setMsg(res.error ?? "Could not shift.");
    });
  }

  return (
    <section className="relative overflow-hidden border border-copper/30 bg-copper/[0.04]">
      <div className="p-6 md:p-7 space-y-5">
        <div className="flex items-center gap-2">
          <span className="text-copper" aria-hidden>✦</span>
          <h3 className="font-display text-lg text-ink">AI schedule</h3>
        </div>
        <p className="text-sm text-ink/55 -mt-2 leading-relaxed">
          Generate realistic phase dates from your build plan, then review before applying.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="field-label">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="field-input w-44"
            />
          </div>
          <div>
            <label className="field-label">Target completion (optional)</label>
            <input
              type="date"
              value={targetEnd}
              onChange={(e) => setTargetEnd(e.target.value)}
              className="field-input w-44"
            />
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={working}
            className="h-11 px-5 app-btn app-btn-primary"
          >
            {working ? "Working…" : phases ? "Regenerate" : "Generate with AI"}
          </button>
        </div>

        {msg && (
          <p className="text-xs text-ink/70 bg-bone/70 border border-ink/10 px-3 py-2">{msg}</p>
        )}

        {phases && (
          <div className="space-y-4">
            <div className="border border-ink/10 bg-paper divide-y divide-ink/8">
              {phases.map((p) => (
                <div key={p.milestoneId} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <span className="text-sm text-ink truncate">{p.title}</span>
                  <span className="font-mono text-xs text-ink/60 shrink-0">
                    {fmt(p.scheduled_start)} – {fmt(p.scheduled_end)}
                  </span>
                </div>
              ))}
            </div>
            <label className="flex items-center gap-3 cursor-pointer text-sm text-ink/70">
              <input
                type="checkbox"
                checked={setTargets}
                onChange={(e) => setSetTargets(e.target.checked)}
                className="w-4 h-4 accent-copper"
              />
              Also set client-facing target dates to each phase end
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={apply}
                disabled={working}
                className="h-10 px-5 app-btn app-btn-accent"
              >
                Apply to schedule
              </button>
              <button
                type="button"
                onClick={() => setPhases(null)}
                className="h-10 px-5 app-btn app-btn-secondary"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        <details className="pt-2 border-t border-ink/10">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-stone-400">
            Handle a delay — shift later phases
          </summary>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="field-label">Shift phases on/after</label>
              <input
                type="date"
                value={slipFrom}
                onChange={(e) => setSlipFrom(e.target.value)}
                className="field-input w-44"
              />
            </div>
            <div>
              <label className="field-label">By days (+/−)</label>
              <input
                type="number"
                value={slipDays}
                onChange={(e) => setSlipDays(Number(e.target.value))}
                className="field-input w-28"
              />
            </div>
            <button
              type="button"
              onClick={slip}
              disabled={working}
              className="h-10 px-5 app-btn app-btn-secondary"
            >
              Shift phases
            </button>
          </div>
          <p className="mt-2 text-xs text-ink/45">
            Pushes every phase starting on/after that date (use a negative number to pull in).
          </p>
        </details>
      </div>
    </section>
  );
}
