"use client";

import { useState, type ReactNode } from "react";

const VIEWS = [
  { key: "timeline", label: "Timeline" },
  { key: "chart", label: "Chart" },
] as const;

type ViewKey = (typeof VIEWS)[number]["key"];

/**
 * Toggle between the mobile-first phase timeline and the Gantt chart.
 * Both views arrive server-rendered; this only switches which is shown.
 */
export function ScheduleViews({ timeline, chart }: { timeline: ReactNode; chart: ReactNode }) {
  const [view, setView] = useState<ViewKey>("timeline");

  return (
    <div>
      <div className="mb-6 inline-flex border border-ink/15" role="tablist" aria-label="Schedule view">
        {VIEWS.map((v) => {
          const selected = view === v.key;
          return (
            <button
              key={v.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setView(v.key)}
              className={`px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                selected
                  ? "bg-ink text-paper"
                  : "bg-transparent text-ink/50 hover:text-ink"
              }`}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      <div className={view === "timeline" ? "" : "hidden"}>{timeline}</div>
      <div className={view === "chart" ? "" : "hidden"}>{chart}</div>
    </div>
  );
}
