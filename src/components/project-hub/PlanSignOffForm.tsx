"use client";

import { useState } from "react";
import { clientRequestPlanRevision, clientSignPlanSet } from "@/lib/actions/plan-sets";

const DEFAULT_ACKNOWLEDGMENT =
  "I have reviewed the plans and renderings in this set, understand the scope described, and approve them for the next phase of design or permitting.";

export function PlanSignOffForm({
  planSetId,
  projectId,
}: {
  planSetId: string;
  projectId: string;
}) {
  const [mode, setMode] = useState<"approve" | "revision" | null>(null);

  if (!mode) {
    return (
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setMode("approve")}
          className="h-11 px-6 app-btn app-btn-primary"
        >
          Sign Off on Plans
        </button>
        <button
          type="button"
          onClick={() => setMode("revision")}
          className="h-11 px-6 app-btn app-btn-secondary"
        >
          Request Revisions
        </button>
      </div>
    );
  }

  if (mode === "revision") {
    return (
      <form
        action={async (fd) => {
          await clientRequestPlanRevision(fd);
          setMode(null);
        }}
        className="mt-8 p-6 border border-amber-200 bg-amber-50/50 space-y-4"
      >
        <input type="hidden" name="id" value={planSetId} />
        <input type="hidden" name="project_id" value={projectId} />
        <h4 className="font-mono text-[10px] tracking-[0.18em] uppercase text-amber-800">
          Request Revisions
        </h4>
        <textarea
          name="revision_notes"
          required
          rows={4}
          className="field-input"
          placeholder="Describe what needs to change in the plans or renderings..."
        />
        <div className="flex gap-3">
          <button
            type="submit"
            className="h-10 px-5 app-btn app-btn-primary"
          >
            Submit Revision Request
          </button>
          <button
            type="button"
            onClick={() => setMode(null)}
            className="h-10 px-5 app-btn app-btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      action={async (fd) => {
        await clientSignPlanSet(fd);
        setMode(null);
      }}
      className="mt-8 p-6 border border-emerald-200 bg-emerald-50/40 space-y-4"
    >
      <input type="hidden" name="id" value={planSetId} />
      <input type="hidden" name="project_id" value={projectId} />
      <h4 className="font-mono text-[10px] tracking-[0.18em] uppercase text-emerald-800">
        Electronic Sign-Off
      </h4>
      <p className="text-sm text-ink/70">
        Your typed name and acknowledgment are stored as a permanent record of approval.
      </p>
      <div>
        <label className="field-label">Full Legal Name *</label>
        <input name="signature_text" required className="field-input" placeholder="Jane Q. Homeowner" />
      </div>
      <div>
        <label className="field-label">Acknowledgment *</label>
        <textarea
          name="acknowledgment"
          required
          rows={3}
          className="field-input"
          defaultValue={DEFAULT_ACKNOWLEDGMENT}
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          className="h-10 px-5 app-btn app-btn-primary"
        >
          Confirm Sign-Off
        </button>
        <button
          type="button"
          onClick={() => setMode(null)}
          className="h-10 px-5 app-btn app-btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
