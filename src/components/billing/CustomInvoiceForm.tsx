"use client";

import { useMemo, useState, useTransition } from "react";
import { createCustomInvoice } from "@/lib/actions/billing";
import { formatMoneyExact } from "@/lib/billing/constants";

type LineItemDraft = {
  description: string;
  quantity: string;
  unit_amount: string;
  reference_number: string;
  city_budget_line_id: string;
};

export type BudgetLineOption = {
  id: string;
  city_number: number;
  description: string;
};

type CustomInvoiceFormProps = {
  projectId: string;
  projectTitle: string;
  clientName?: string | null;
  compact?: boolean;
  /** City-approved budget lines — shows the City # picker when present */
  budgetLines?: BudgetLineOption[];
};

const EMPTY_LINE: LineItemDraft = {
  description: "",
  quantity: "1",
  unit_amount: "",
  reference_number: "",
  city_budget_line_id: "",
};

function lineTotal(item: LineItemDraft) {
  const quantity = Number(item.quantity);
  const unitAmount = Number(item.unit_amount);
  if (!Number.isFinite(quantity) || !Number.isFinite(unitAmount)) return 0;
  return Math.round(quantity * unitAmount * 100) / 100;
}

export function CustomInvoiceForm({
  projectId,
  projectTitle,
  clientName,
  compact = false,
  budgetLines = [],
}: CustomInvoiceFormProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([{ ...EMPTY_LINE }]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hasBudget = budgetLines.length > 0;

  const total = useMemo(
    () => lineItems.reduce((sum, item) => sum + lineTotal(item), 0),
    [lineItems]
  );

  function updateLine(index: number, patch: Partial<LineItemDraft>) {
    setLineItems((items) =>
      items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function addLine() {
    setLineItems((items) => [...items, { ...EMPTY_LINE }]);
  }

  function removeLine(index: number) {
    setLineItems((items) => (items.length === 1 ? items : items.filter((_, i) => i !== index)));
  }

  function resetForm() {
    setTitle("");
    setNotes("");
    setDueDate("");
    setLineItems([{ ...EMPTY_LINE }]);
    setError(null);
  }

  function submit(sendNow: boolean) {
    setError(null);
    setSuccess(null);

    const payload = lineItems.map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unit_amount: Number(item.unit_amount),
      reference_number: item.reference_number.trim() || null,
      city_budget_line_id: item.city_budget_line_id || null,
    }));

    const formData = new FormData();
    formData.set("project_id", projectId);
    formData.set("title", title.trim());
    formData.set("notes", notes.trim());
    formData.set("due_date", dueDate);
    formData.set("line_items", JSON.stringify(payload));
    if (sendNow) formData.set("send_now", "on");

    startTransition(async () => {
      try {
        await createCustomInvoice(formData);
        resetForm();
        setSuccess(
          sendNow
            ? "Invoice sent to the client."
            : "Draft invoice saved. Open the draft to attach the backup invoices."
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save invoice.");
      }
    });
  }

  return (
    <section className={compact ? "" : "mb-12"}>
      {!compact && (
        <div className="mb-6">
          <h3 className="font-display text-xl md:text-2xl text-ink">Custom invoice</h3>
          <p className="mt-1 text-sm text-ink/55 max-w-2xl leading-relaxed">
            Each line is one backup invoice you&apos;re billing for — the invoice total is the sum
            of the backups you attach.
            {clientName ? (
              <>
                {" "}
                Sends to <strong className="text-ink">{clientName}</strong> when you click Send.
              </>
            ) : (
              <> Link a client on Job Details before sending.</>
            )}
          </p>
        </div>
      )}

      <div className="hub-panel p-5 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="field-label">Invoice title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you billing for?"
              className="field-input w-full"
              required
            />
          </div>
          <div>
            <label className="field-label">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="field-input w-full"
            />
          </div>
          <div>
            <label className="field-label">Total preview</label>
            <div className="h-10 flex items-center font-display text-2xl text-ink px-1">
              {formatMoneyExact(total)}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment instructions or context for your records"
              className="field-input w-full min-h-[72px] resize-y"
            />
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-ink/8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-400">
              Line items — one per backup invoice
            </p>
            <button
              type="button"
              onClick={addLine}
              className="font-mono text-[10px] uppercase tracking-wider text-copper hover:underline"
            >
              + Add line
            </button>
          </div>

          <ul className="space-y-4">
            {lineItems.map((item, index) => (
              <li key={index} className="rounded-lg border border-ink/10 p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-6">
                    <label className="field-label">Description</label>
                    <input
                      value={item.description}
                      onChange={(e) => updateLine(index, { description: e.target.value })}
                      placeholder="What is this backup invoice for?"
                      className="field-input w-full"
                      required
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="field-label">Qty</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateLine(index, { quantity: e.target.value })}
                      className="field-input w-full"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="field-label">Unit ($)</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.unit_amount}
                      onChange={(e) => updateLine(index, { unit_amount: e.target.value })}
                      className="field-input w-full"
                      required
                    />
                  </div>
                  <div className="sm:col-span-3 flex items-end justify-between gap-2">
                    <div>
                      <p className="field-label">Amount</p>
                      <p className="h-10 flex items-center font-mono text-sm text-ink">
                        {formatMoneyExact(lineTotal(item))}
                      </p>
                    </div>
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="h-10 px-2 text-stone-400 hover:text-ink font-mono text-[10px] uppercase"
                        aria-label="Remove line item"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4">
                    <label className="field-label">Backup Inv. # (optional)</label>
                    <input
                      value={item.reference_number}
                      onChange={(e) => updateLine(index, { reference_number: e.target.value })}
                      placeholder="e.g. 2120"
                      className="field-input w-full"
                    />
                  </div>
                  {hasBudget && (
                    <div className="sm:col-span-8">
                      <label className="field-label">City budget line</label>
                      <select
                        value={item.city_budget_line_id}
                        onChange={(e) =>
                          updateLine(index, { city_budget_line_id: e.target.value })
                        }
                        className="field-input w-full"
                      >
                        <option value="">— No city # —</option>
                        {budgetLines.map((line) => (
                          <option key={line.id} value={line.id}>
                            {line.city_number} — {line.description}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 px-3 py-2">
            {success}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => submit(true)}
            className="app-btn app-btn-accent"
          >
            {pending ? "Working…" : "Send invoice"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => submit(false)}
            className="h-11 px-6 app-btn app-btn-secondary"
          >
            Save draft
          </button>
        </div>
        <p className="mt-3 text-xs text-ink/45">
          Tip: save a draft first, then attach each backup invoice PDF on the draft page before
          sending.
        </p>
      </div>
    </section>
  );
}
