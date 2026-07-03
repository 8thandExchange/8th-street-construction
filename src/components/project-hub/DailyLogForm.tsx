"use client";

import { useState, useTransition } from "react";
import { StorageUpload } from "./StorageUpload";
import { createDailyLog } from "@/lib/actions/daily-logs";
import { draftDailyLog } from "@/lib/actions/ai-daily-log";

export function DailyLogForm({ projectId, today }: { projectId: string; today: string }) {
  const [notes, setNotes] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [weather, setWeather] = useState("");
  const [summary, setSummary] = useState("");
  const [issues, setIssues] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [drafting, startDrafting] = useTransition();

  function handleDraft() {
    setAiError(null);
    startDrafting(async () => {
      const result = await draftDailyLog({ projectId, notes, imageUrls });
      if (result.ok) {
        setSummary(result.draft.summary);
        setIssues(result.draft.issues || "");
        if (result.draft.weather) setWeather(result.draft.weather);
      } else {
        setAiError(result.error);
      }
    });
  }

  return (
    <form
      action={async (fd) => {
        await createDailyLog(fd);
        setNotes("");
        setImageUrls([]);
        setWeather("");
        setSummary("");
        setIssues("");
      }}
      className="mt-8 p-6 border border-ink/15 bg-paper space-y-5"
    >
      <input type="hidden" name="project_id" value={projectId} />

      {/* AI quick-capture */}
      <div className="border border-copper/30 bg-copper/5 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="eyebrow">Quick capture</span>
          <button
            type="button"
            onClick={handleDraft}
            disabled={drafting}
            className="inline-flex items-center gap-2 h-9 px-4 border border-copper/40 bg-paper text-copper font-mono text-[10px] tracking-[0.16em] uppercase hover:bg-copper hover:text-bone transition-colors disabled:opacity-50"
          >
            <span aria-hidden>✦</span>
            {drafting ? "Drafting…" : "Draft with AI"}
          </button>
        </div>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Rough notes — e.g. 'framed back wall, electrician roughed kitchen, rain delayed concrete'"
          className="field-input"
        />
        <StorageUpload
          bucket="project-updates"
          projectId={projectId}
          multiple
          accept="image/*"
          label="Add jobsite photos"
          onComplete={(files) =>
            setImageUrls((prev) => [...prev, ...files.map((f) => f.publicUrl!).filter(Boolean)])
          }
        />
        {imageUrls.length > 0 && (
          <p className="text-xs font-mono text-stone-300">{imageUrls.length} photo(s) attached</p>
        )}
        <p className="text-xs text-ink/45 leading-relaxed">
          Drop in shorthand and photos — AI writes the log below. Review before saving.
        </p>
        {aiError && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2">
            {aiError}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="field-label">Date</label>
          <input type="date" name="log_date" defaultValue={today} className="field-input" required />
        </div>
        <div>
          <label className="field-label">Weather</label>
          <input
            name="weather"
            className="field-input"
            placeholder="Clear, 72°F"
            value={weather}
            onChange={(e) => setWeather(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">Crew count</label>
          <input type="number" name="crew_count" min={0} className="field-input" />
        </div>
      </div>
      <div>
        <label className="field-label">Work completed *</label>
        <textarea
          name="summary"
          rows={4}
          className="field-input"
          required
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>
      <div>
        <label className="field-label">Issues / delays</label>
        <textarea
          name="issues"
          rows={2}
          className="field-input"
          value={issues}
          onChange={(e) => setIssues(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="h-11 px-5 app-btn app-btn-primary"
      >
        Save Log
      </button>
    </form>
  );
}
