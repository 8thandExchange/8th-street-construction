"use client";

import { useMemo, useState, useTransition } from "react";
import { createPurchaseOrder } from "@/lib/actions/purchase-orders";
import { formatMoney } from "@/lib/billing/constants";

type LineDraft = {
  description: string;
  quantity: string;
  unit_amount: string;
  cost_division: string;
};

const EMPTY_LINE: LineDraft = { description: "", quantity: "1", unit_amount: "", cost_division: "" };

function lineTotal(li: LineDraft) {
  const q = Number(li.quantity);
  const u = Number(li.unit_amount);
  if (!Number.isFinite(q) || !Number.isFinite(u)) return 0;
  return Math.round(q * u * 100) / 100;
}

export function PurchaseOrderForm({
  projectId,
  subcontractors,
  divisions,
}: {
  projectId: string;
  subcontractors: { id: string; company_name: string; trade: string | null }[];
  divisions: { division_code: string; trade_label: string }[];
}) {
  const [subId, setSubId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ ...EMPTY_LINE }]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = useMemo(() => lines.reduce((sum, li) => sum + lineTotal(li), 0), [lines]);

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((items) => items.map((li, i) => (i === index ? { ...li, ...patch } : li)));
  }

  function submit() {
    setError(null);
    setSuccess(null);
    const fd = new FormData();
    fd.set("project_id", projectId);
    fd.set("subcontractor_id", subId);
    fd.set("title", title);
    fd.set("description", description);
    fd.set("needed_by", neededBy);
    fd.set("notes", notes);
    fd.set(
      "line_items",
      JSON.stringify(
        lines
          .filter((li) => li.description.trim() || li.unit_amount)
          .map((li) => ({
            description: li.description,
            quantity: Number(li.quantity),
            unit_amount: Number(li.unit_amount),
            cost_division: li.cost_division || null,
          }))
      )
    );
    startTransition(async () => {
      try {
        await createPurchaseOrder(fd);
        setSuccess("Purchase order saved as a draft below — issue it when you're ready.");
        setSubId("");
        setTitle("");
        setDescription("");
        setNeededBy("");
        setNotes("");
        setLines([{ ...EMPTY_LINE }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create the purchase order.");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="app-card p-6 md:p-8 space-y-5"
    >
      <div>
        <h3 className="app-h2 !text-[16px]">New purchase order</h3>
        <p className="mt-1 text-sm app-muted">
          Commit cost to a sub or vendor. Saved as a draft — nothing is sent until you issue it.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="app-label mb-1.5 block">Subcontractor / vendor</label>
          <select value={subId} onChange={(e) => setSubId(e.target.value)} className="w-full">
            <option value="">— Choose (optional for materials) —</option>
            {subcontractors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.company_name}
                {s.trade ? ` — ${s.trade}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="app-label mb-1.5 block">Needed by</label>
          <input
            type="date"
            value={neededBy}
            onChange={(e) => setNeededBy(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div>
        <label className="app-label mb-1.5 block">Work / order title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='e.g. "Rough plumbing labor & materials"'
          className="w-full"
          required
        />
      </div>

      <div>
        <label className="app-label mb-1.5 block">Scope description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full"
        />
      </div>

      <div>
        <label className="app-label mb-1.5 block">Line items *</label>
        <div className="space-y-2">
          {lines.map((li, i) => (
            <div key={i} className="grid grid-cols-[1fr_64px_110px_1fr_auto] gap-2 items-center">
              <input
                type="text"
                placeholder="Description"
                value={li.description}
                onChange={(e) => updateLine(i, { description: e.target.value })}
              />
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Qty"
                value={li.quantity}
                onChange={(e) => updateLine(i, { quantity: e.target.value })}
              />
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Unit $"
                value={li.unit_amount}
                onChange={(e) => updateLine(i, { unit_amount: e.target.value })}
              />
              <select
                value={li.cost_division}
                onChange={(e) => updateLine(i, { cost_division: e.target.value })}
              >
                <option value="">Cost division (optional)</option>
                {divisions.map((d) => (
                  <option key={d.division_code} value={d.division_code}>
                    {d.division_code} — {d.trade_label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setLines((items) => items.filter((_, idx) => idx !== i))}
                disabled={lines.length === 1}
                className="app-btn app-btn-ghost !h-8 !px-2 !text-[12px] disabled:opacity-30"
                title="Remove line"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setLines((items) => [...items, { ...EMPTY_LINE }])}
          className="mt-2 app-btn app-btn-secondary !h-8 !text-[12.5px]"
        >
          + Add line
        </button>
      </div>

      <div>
        <label className="app-label mb-1.5 block">Notes to the sub</label>
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full" />
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {success && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      )}

      <div className="flex items-center justify-between gap-4">
        <span className="text-sm app-muted">
          Total: <span className="font-semibold text-navy">{formatMoney(total)}</span>
        </span>
        <button type="submit" disabled={pending} className="app-btn app-btn-primary">
          {pending ? "Saving…" : "Save draft PO"}
        </button>
      </div>
    </form>
  );
}
