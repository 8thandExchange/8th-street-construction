"use client";

import { useState } from "react";
import { createBasePlan } from "@/lib/actions/base-plans";
import { BasePlanPdfUpload } from "./BasePlanPdfUpload";

type UploadedPdf = {
  path: string;
  size: number;
  type: string;
  fileName: string;
};

export function NewBasePlanForm({ nextDisplayOrder }: { nextDisplayOrder: number }) {
  const [open, setOpen] = useState(false);
  const [planNumber, setPlanNumber] = useState("");
  const [name, setName] = useState("");
  const [uploaded, setUploaded] = useState<UploadedPdf | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function suggestPlanNumber(value: string) {
    setName(value);
    if (!planNumber) {
      setPlanNumber(
        value
          .replace(/^the\s+/i, "")
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      );
    }
  }

  function reset() {
    setOpen(false);
    setPlanNumber("");
    setName("");
    setUploaded(null);
    setError(null);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-8 inline-flex h-11 items-center px-5 bg-ink text-bone hover:bg-copper font-mono text-[10px] tracking-[0.2em] uppercase transition-colors"
      >
        + Add Standard Plan
      </button>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const fd = new FormData(e.currentTarget);
        if (uploaded) {
          fd.set("storage_path", uploaded.path);
          fd.set("file_type", uploaded.type);
          fd.set("file_size_bytes", String(uploaded.size));
        }

        const result = await createBasePlan(fd);
        setSaving(false);

        if ("error" in result && result.error) {
          setError(result.error);
          return;
        }
        reset();
      }}
      className="mb-10 p-8 border border-ink/15 bg-paper space-y-5"
    >
      <h3 className="eyebrow">Add Standard Plan</h3>
      <p className="text-sm text-ink/60">
        Upload a PDF to the company catalog. It will be available to assign on project overviews.
      </p>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="field-label">Plan Name *</label>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => suggestPlanNumber(e.target.value)}
            className="field-input"
            placeholder="e.g. The Augusta"
          />
        </div>
        <div>
          <label className="field-label">Plan Number *</label>
          <input
            name="plan_number"
            required
            value={planNumber}
            onChange={(e) => setPlanNumber(e.target.value.toUpperCase())}
            className="field-input font-mono"
            placeholder="e.g. AUGUSTA"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        <div>
          <label className="field-label">Designer</label>
          <input
            name="designer"
            defaultValue="8th Street Construction"
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Variant</label>
          <input name="variant" className="field-input" placeholder="Optional — e.g. Porch Left" />
        </div>
        <div>
          <label className="field-label">Sheet Count</label>
          <input name="sheet_count" type="number" min={1} className="field-input" placeholder="—" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="field-label">Display Order</label>
          <input
            name="display_order"
            type="number"
            min={0}
            defaultValue={nextDisplayOrder}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Notes</label>
          <input
            name="notes"
            className="field-input"
            placeholder="Optional catalog notes"
          />
        </div>
      </div>

      <div>
        <label className="field-label">Plan PDF *</label>
        <BasePlanPdfUpload
          planNumber={planNumber}
          onComplete={setUploaded}
          label={uploaded ? "PDF ready — upload a different file" : "Drop in plan PDF"}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!uploaded || saving}
          className="h-10 px-5 bg-ink text-bone disabled:opacity-40 font-mono text-[10px] tracking-[0.2em] uppercase"
        >
          {saving ? "Saving…" : "Add to Catalog"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="h-10 px-5 border border-ink/20 font-mono text-[10px] uppercase"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
