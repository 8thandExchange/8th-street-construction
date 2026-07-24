"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoneyExact } from "@/lib/billing/constants";

type BuildResult = {
  invoice_id: string;
  invoice_number: string;
  total: number;
  lines: { description: string; amount: number; reference_number: string | null; city_number: number | null }[];
  warnings: string[];
  admin_page: string;
};

/**
 * The easy path: drag the subs' invoices in, we read each one (vendor,
 * invoice #, amount, City #), and a ready-to-review draft cover-sheet
 * invoice appears with every backup attached. Nothing sends automatically.
 */
export function InvoiceBuilderDropzone({ projectId }: { projectId: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [building, setBuilding] = useState<string | null>(null);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function build(files: File[]) {
    if (!files.length || building) return;
    setError(null);
    setResult(null);
    setBuilding(
      files.length === 1 ? "Reading your invoice…" : `Reading ${files.length} invoices…`
    );
    try {
      const fd = new FormData();
      fd.set("project_id", projectId);
      for (const f of files) fd.append("files", f);
      const res = await fetch("/api/invoices/build-from-backups", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Could not build the invoice.");
      setResult(body as BuildResult);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the invoice.");
    } finally {
      setBuilding(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <section className="mb-10">
      <input
        ref={fileInput}
        type="file"
        multiple
        accept="application/pdf,image/png,image/jpeg"
        className="hidden"
        onChange={(e) => build(Array.from(e.target.files ?? []))}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() => !building && fileInput.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !building && fileInput.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          build(Array.from(e.dataTransfer.files));
        }}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 md:p-10 text-center transition-colors ${
          dragOver
            ? "border-copper bg-copper/[0.06]"
            : "border-navy/20 bg-white hover:border-copper/60"
        }`}
      >
        {building ? (
          <div>
            <p className="text-lg font-medium text-navy animate-pulse">{building}</p>
            <p className="mt-2 text-sm app-muted">
              Pulling the vendor, invoice number, amount, and City # from each one.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-medium text-navy">
              Drop your subs&apos; invoices here to bill them
            </p>
            <p className="mt-2 text-sm app-muted max-w-lg mx-auto">
              We read each PDF or photo, match it to the city budget, and build the draft
              invoice — cover sheet, Inv. #s, City #s, and every backup attached. You review
              it before anything is sent.
            </p>
            <p className="mt-3 text-xs app-muted">PDF, PNG, or JPG · or click to choose files</p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-emerald-900">
                Draft {result.invoice_number} built — {formatMoneyExact(result.total)}
              </p>
              <p className="mt-0.5 text-sm text-emerald-800">
                {result.lines.length} line{result.lines.length === 1 ? "" : "s"}, each with its
                backup attached. Nothing has been sent.
              </p>
            </div>
            <a href={result.admin_page} className="app-btn app-btn-accent shrink-0">
              Review &amp; send
            </a>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-emerald-900">
            {result.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="truncate">
                  {l.description}
                  {l.reference_number ? ` · Inv. #${l.reference_number}` : ""}
                  {l.city_number != null ? ` · City #${l.city_number}` : ""}
                </span>
                <span className="tabular-nums shrink-0">{formatMoneyExact(l.amount)}</span>
              </li>
            ))}
          </ul>
          {result.warnings.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-amber-800">
              {result.warnings.map((w, i) => (
                <li key={i}>⚠ {w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
