"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateDraftInvoice } from "@/lib/actions/billing";
import { formatMoney } from "@/lib/billing/constants";
import type { BudgetLineOption } from "./CustomInvoiceForm";

type LineDraft = {
  id: string | null;
  description: string;
  quantity: string;
  unit_amount: string;
  reference_number: string;
  city_budget_line_id: string;
};

function lineTotal(li: LineDraft) {
  const q = Number(li.quantity);
  const u = Number(li.unit_amount);
  if (!Number.isFinite(q) || !Number.isFinite(u)) return 0;
  return Math.round(q * u * 100) / 100;
}

const EMPTY_LINE: LineDraft = {
  id: null,
  description: "",
  quantity: "1",
  unit_amount: "",
  reference_number: "",
  city_budget_line_id: "",
};

export function EditDraftInvoiceForm({
  projectId,
  invoiceId,
  initial,
  budgetLines = [],
}: {
  projectId: string;
  invoiceId: string;
  initial: {
    title: string;
    due_date: string | null;
    notes: string | null;
    line_items: {
      id: string;
      description: string;
      quantity: number;
      unit_amount: number;
      reference_number: string | null;
      city_budget_line_id: string | null;
    }[];
  };
  budgetLines?: BudgetLineOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [dueDate, setDueDate] = useState(initial.due_date ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    initial.line_items.length
      ? initial.line_items.map((li) => ({
          id: li.id,
          description: li.description,
          quantity: String(li.quantity),
          unit_amount: String(li.unit_amount),
          reference_number: li.reference_number ?? "",
          city_budget_line_id: li.city_budget_line_id ?? "",
        }))
      : [{ ...EMPTY_LINE }]
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const hasBudget = budgetLines.length > 0;
  const total = useMemo(() => lines.reduce((sum, li) => sum + lineTotal(li), 0), [lines]);

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((items) => items.map((li, i) => (i === index ? { ...li, ...patch } : li)));
  }

  function submit() {
    setError(null);
    setSaved(false);
    const fd = new FormData();
    fd.set("project_id", projectId);
    fd.set("invoice_id", invoiceId);
    fd.set("title", title);
    fd.set("due_date", dueDate);
    fd.set("notes", notes);
    fd.set(
      "line_items",
      JSON.stringify(
        lines
          .filter((li) => li.description.trim() || li.unit_amount)
          .map((li) => ({
            id: li.id,
            description: li.description,
            quantity: Number(li.quantity),
            unit_amount: Number(li.unit_amount),
            reference_number: li.reference_number.trim() || null,
            city_budget_line_id: li.city_budget_line_id || null,
          }))
      )
    );
    startTransition(async () => {
      try {
        await updateDraftInvoice(fd);
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save changes.");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-5"
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-5">
        <div>
          <label className="app-label mb-1.5 block">Invoice title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full"
            required
          />
        </div>
        <div>
          <label className="app-label mb-1.5 block">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div>
        <label className="app-label mb-1.5 block">Line items — one per backup invoice *</label>
        <div className="space-y-3">
          {lines.map((li, i) => (
            <div key={li.id ?? `new-${i}`} className="rounded-lg border border-navy/10 p-3 space-y-2">
              <div className="grid grid-cols-[1fr_70px_120px_auto] gap-2 items-center">
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
                  placeholder="Amount $"
                  value={li.unit_amount}
                  onChange={(e) => updateLine(i, { unit_amount: e.target.value })}
                />
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
              <div className={`grid gap-2 ${hasBudget ? "grid-cols-[120px_1fr]" : "grid-cols-1"}`}>
                <input
                  type="text"
                  placeholder="Backup Inv. #"
                  value={li.reference_number}
                  onChange={(e) => updateLine(i, { reference_number: e.target.value })}
                />
                {hasBudget && (
                  <select
                    value={li.city_budget_line_id}
                    onChange={(e) => updateLine(i, { city_budget_line_id: e.target.value })}
                  >
                    <option value="">— No city # —</option>
                    {budgetLines.map((line) => (
                      <option key={line.id} value={line.id}>
                        City #{line.city_number} — {line.description}
                      </option>
                    ))}
                  </select>
                )}
              </div>
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
        <label className="app-label mb-1.5 block">Internal notes</label>
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full" />
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {saved && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Draft saved. Nothing has been sent — use &quot;Send to client&quot; when it&apos;s ready.
        </p>
      )}

      <div className="flex items-center justify-between gap-4">
        <span className="text-sm app-muted">
          New total: <span className="font-semibold text-navy">{formatMoney(total)}</span>
        </span>
        <button type="submit" disabled={pending} className="app-btn app-btn-primary">
          {pending ? "Saving…" : "Save draft"}
        </button>
      </div>
    </form>
  );
}
