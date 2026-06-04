"use client";

import { useState } from "react";
import { submitBid } from "@/lib/actions/bids";

export function BidSubmitForm({ bidId, canSubmit }: { bidId: string; canSubmit: boolean }) {
  const [open, setOpen] = useState(false);

  if (!canSubmit) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 h-10 px-5 bg-ink text-bone font-mono text-[10px] uppercase tracking-wider"
      >
        Submit Bid
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        await submitBid(fd);
        setOpen(false);
      }}
      className="mt-4 p-4 bg-bone/50 border border-ink/10 space-y-3"
    >
      <input type="hidden" name="bid_id" value={bidId} />
      <div>
        <label className="field-label">Bid amount ($) *</label>
        <input type="number" name="amount" step="0.01" min={1} required className="field-input" />
      </div>
      <textarea name="notes" rows={3} placeholder="Notes, exclusions, lead time…" className="field-input" />
      <div className="flex gap-2">
        <button type="submit" className="h-9 px-4 bg-copper text-bone font-mono text-[10px] uppercase">
          Submit
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-9 px-4 border border-ink/20 font-mono text-[10px] uppercase"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
