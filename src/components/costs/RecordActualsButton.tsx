"use client";

import { useActionState } from "react";
import { recordCostSnapshotAction, type SnapshotState } from "@/lib/actions/cost-history";

/**
 * "Record actuals to history" — takes the closeout snapshot that feeds
 * every future estimate's benchmarks. Safe to re-run: each capture
 * replaces the previous one for this project.
 */
export function RecordActualsButton({
  projectId,
  lastCapturedAt,
}: {
  projectId: string;
  lastCapturedAt: string | null;
}) {
  const [state, formAction, pending] = useActionState<SnapshotState, FormData>(
    recordCostSnapshotAction,
    { status: "idle" }
  );

  const lastLabel =
    state.status === "captured"
      ? new Date(state.capturedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : lastCapturedAt
        ? new Date(lastCapturedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : null;

  return (
    <div>
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="project_id" value={projectId} />
        <button type="submit" disabled={pending} className="app-btn shrink-0">
          {pending ? "Recording…" : "Record actuals to history"}
        </button>
        <span className="text-xs text-ink/45">
          {lastLabel
            ? `Last recorded ${lastLabel}. Feeds the benchmarks future estimates price from.`
            : "Never recorded. Do this at closeout so future estimates learn from this job."}
        </span>
      </form>
      {state.status === "captured" && (
        <p className="mt-1.5 text-xs text-emerald-700">
          Recorded {state.lines} line{state.lines === 1 ? "" : "s"} to history.
        </p>
      )}
      {state.status === "error" && (
        <p className="mt-1.5 text-xs text-rust">{state.message}</p>
      )}
    </div>
  );
}
