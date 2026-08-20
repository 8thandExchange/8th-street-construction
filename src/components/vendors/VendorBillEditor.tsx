"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Loader2, Plus, X } from "lucide-react";
import {
  updateVendorBill,
  updateVendorRemit,
  payVendorBillAch,
} from "@/lib/actions/vendors";

type Line = { description: string; amount: string };

export function BillEditForm({
  vendorId,
  billId,
  projects,
  initial,
}: {
  vendorId: string;
  billId: string;
  projects: { id: string; title: string }[];
  initial: {
    title: string;
    bill_number: string | null;
    amount: number;
    project_id: string | null;
    issued_date: string | null;
    due_date: string | null;
    notes: string | null;
    line_items: { description: string; amount: number }[];
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>(
    initial.line_items.length
      ? initial.line_items.map((l) => ({ description: l.description, amount: String(l.amount) }))
      : [{ description: initial.title, amount: String(initial.amount) }]
  );

  // Mirror the server's parseBillLines filter exactly, so the total shown
  // here is the total that gets saved — and printed on the PDF.
  const validLines = lines.filter(
    (l) => l.description.trim() && Number.isFinite(Number(l.amount)) && Number(l.amount) > 0
  );
  const lineTotal = validLines.reduce((s, l) => s + Number(l.amount), 0);
  const incompleteCount = lines.length - validLines.length;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("bill_id", billId);
      fd.set("vendor_id", vendorId);
      fd.set(
        "line_items",
        JSON.stringify(
          validLines.map((l) => ({ description: l.description.trim(), amount: Number(l.amount) }))
        )
      );
      const result = await updateVendorBill(fd);
      if (result && "error" in result && result.error) {
        setError(String(result.error));
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="field-label">Invoice title *</label>
        <input name="title" required defaultValue={initial.title} className="field-input w-full" />
      </div>
      <div>
        <label className="field-label">Invoice #</label>
        <input
          name="bill_number"
          defaultValue={initial.bill_number ?? ""}
          placeholder="MC-001"
          className="field-input w-full"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="field-label">Line items</label>
        <div className="space-y-2">
          {lines.map((line, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                value={line.description}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l, i) => (i === idx ? { ...l, description: e.target.value } : l))
                  )
                }
                placeholder="Thompsons Clearing"
                className="field-input min-w-0 flex-1"
              />
              <input
                value={line.amount}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l, i) => (i === idx ? { ...l, amount: e.target.value } : l))
                  )
                }
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="field-input w-32 shrink-0 text-right"
              />
              <button
                type="button"
                onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                disabled={lines.length === 1}
                className="text-navy/40 hover:text-red-600 disabled:opacity-30"
                title="Remove line"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, { description: "", amount: "" }])}
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-copper hover:underline"
          >
            <Plus size={13} /> Add line
          </button>
          <p className="text-sm font-semibold text-navy tabular-nums">
            Total: ${lineTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        {incompleteCount > 0 && (
          <p className="mt-1.5 text-[12.5px] app-muted">
            {incompleteCount === 1 ? "1 line needs" : `${incompleteCount} lines need`} a
            description and an amount above $0 — {incompleteCount === 1 ? "it won't" : "they won't"}{" "}
            be saved or appear on the PDF.
          </p>
        )}
      </div>

      <div>
        <label className="field-label">Job</label>
        <select
          name="project_id"
          defaultValue={initial.project_id ?? ""}
          className="field-input w-full"
        >
          <option value="">— Company overhead —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Invoice date</label>
          <input
            name="issued_date"
            type="date"
            defaultValue={initial.issued_date ?? ""}
            className="field-input w-full"
          />
        </div>
        <div>
          <label className="field-label">Due date</label>
          <input
            name="due_date"
            type="date"
            defaultValue={initial.due_date ?? ""}
            className="field-input w-full"
          />
        </div>
      </div>
      <div className="sm:col-span-2">
        <label className="field-label">Notes (internal)</label>
        <input name="notes" defaultValue={initial.notes ?? ""} className="field-input w-full" />
      </div>

      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={busy} className="app-btn app-btn-primary !h-9">
          {busy && <Loader2 size={14} className="mr-1.5 animate-spin" />}
          Save invoice
        </button>
        {saved && <span className="text-[12.5px] font-medium text-copper">Saved ✓</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

export function RemitForm({
  vendorId,
  initial,
}: {
  vendorId: string;
  initial: {
    address: string | null;
    remit_account_name: string | null;
    /**
     * Last four digits only. The account number is encrypted at rest and
     * never sent to the browser — pre-filling it would have put the full
     * number in the page source on every load, which is exactly what
     * encrypting it was meant to stop.
     */
    remit_account_last4: string | null;
    remit_routing_number: string | null;
    remit_account_type: string | null;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("vendor_id", vendorId);
      const result = await updateVendorRemit(fd);
      if (result && "error" in result && result.error) {
        setError(String(result.error));
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="field-label">Vendor address</label>
        <input
          name="address"
          defaultValue={initial.address ?? ""}
          placeholder="1661 Broad Street, Augusta GA 30904"
          className="field-input w-full"
        />
      </div>
      <div>
        <label className="field-label">Account name</label>
        <input
          name="remit_account_name"
          defaultValue={initial.remit_account_name ?? ""}
          className="field-input w-full"
        />
      </div>
      <div>
        <label className="field-label">Account type</label>
        <select
          name="remit_account_type"
          defaultValue={initial.remit_account_type ?? "businessChecking"}
          className="field-input w-full"
        >
          <option value="businessChecking">Business checking</option>
          <option value="businessSavings">Business savings</option>
          <option value="personalChecking">Personal checking</option>
          <option value="personalSavings">Personal savings</option>
        </select>
      </div>
      <div>
        <label className="field-label">Account number</label>
        <input
          name="remit_account_number"
          placeholder={
            initial.remit_account_last4
              ? `•••• ${initial.remit_account_last4} — leave blank to keep`
              : "Not on file yet"
          }
          inputMode="numeric"
          autoComplete="off"
          className="field-input w-full"
        />
      </div>
      <div>
        <label className="field-label">Routing number</label>
        <input
          name="remit_routing_number"
          defaultValue={initial.remit_routing_number ?? ""}
          inputMode="numeric"
          className="field-input w-full"
        />
      </div>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={busy} className="app-btn app-btn-secondary !h-9">
          {busy && <Loader2 size={14} className="mr-1.5 animate-spin" />}
          Save payment details
        </button>
        {saved && <span className="text-[12.5px] font-medium text-copper">Saved ✓</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

export function PayAchButton({
  vendorId,
  billId,
  amountLabel,
  vendorName,
  payable,
}: {
  vendorId: string;
  billId: string;
  amountLabel: string;
  vendorName: string;
  /** Banking details on file here, or a Mercury recipient already linked. */
  payable: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("bill_id", billId);
      fd.set("vendor_id", vendorId);
      const result = await payVendorBillAch(fd);
      if (result && "error" in result && result.error) {
        setError(String(result.error));
        setConfirming(false);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!payable) {
    return (
      <p className="text-sm app-muted">
        Add the vendor&apos;s account and routing numbers below to enable ACH payment, or set them
        up as a Mercury recipient and link it.
      </p>
    );
  }

  return (
    <div>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-navy">
            Send {amountLabel} to {vendorName} by ACH?
          </span>
          <button
            onClick={pay}
            disabled={busy}
            className="app-btn app-btn-accent !h-9"
          >
            {busy && <Loader2 size={14} className="mr-1.5 animate-spin" />}
            Yes — send payment
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="app-btn app-btn-ghost !h-9"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="app-btn app-btn-accent !h-9">
          <Banknote size={15} className="mr-1.5" />
          Pay {amountLabel} by ACH
        </button>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
