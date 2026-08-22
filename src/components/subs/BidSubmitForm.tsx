"use client";

import { useState } from "react";
import { submitBid } from "@/lib/actions/bids";

export function BidSubmitForm({
  bidId,
  canSubmit,
  initialAmount,
  initialNotes,
}: {
  bidId: string;
  canSubmit: boolean;
  initialAmount?: number | null;
  initialNotes?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canSubmit) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="app-btn app-btn-primary mt-4"
      >
        {initialAmount ? "Update bid" : "Submit bid"}
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        setSaving(true);
        setError(null);
        const result = await submitBid(fd);
        setSaving(false);
        if (result?.error) {
          setError(result.error);
          return;
        }
        setOpen(false);
      }}
      className="app-inset mt-4 space-y-4 p-4"
    >
      <input type="hidden" name="bid_id" value={bidId} />
      <div>
        <label htmlFor={`bid-amount-${bidId}`} className="field-label">Bid amount ($) *</label>
        <input
          id={`bid-amount-${bidId}`}
          type="number"
          name="amount"
          step="0.01"
          min={1}
          required
          defaultValue={initialAmount ?? undefined}
          className="field-input"
        />
      </div>
      <div>
        <label htmlFor={`bid-notes-${bidId}`} className="field-label">Qualifications and notes</label>
        <textarea
          id={`bid-notes-${bidId}`}
          name="notes"
          rows={4}
          defaultValue={initialNotes ?? undefined}
          placeholder="Exclusions, alternates, lead time, payment terms…"
          className="field-input"
        />
      </div>
      <div>
        <label htmlFor={`bid-document-${bidId}`} className="field-label">Bid document</label>
        <input
          id={`bid-document-${bidId}`}
          type="file"
          name="document"
          accept=".pdf,image/png,image/jpeg,image/webp"
          className="block w-full text-sm text-navy/70 file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-2 file:text-xs file:font-medium file:text-white"
        />
        <p className="mt-1 text-xs app-muted">Optional PDF or image, up to 10 MB.</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="app-btn app-btn-primary">
          {saving ? "Saving…" : initialAmount ? "Update bid" : "Submit bid"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={saving}
          className="app-btn app-btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
