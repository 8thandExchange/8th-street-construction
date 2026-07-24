"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteInvoiceAttachment } from "@/lib/actions/invoice-attachments";
import { formatMoneyExact } from "@/lib/billing/constants";

type LineSummary = {
  id: string;
  description: string;
  amount: number;
  reference_number: string | null;
};

type AttachmentSummary = {
  id: string;
  line_item_id: string | null;
  file_name: string;
};

/**
 * Backup invoices behind the cover sheet. Each line item should have its
 * backup attached — the invoice total is the sum of those backups.
 */
export function InvoiceAttachmentsCard({
  projectId,
  invoiceId,
  lines,
  attachments,
}: {
  projectId: string;
  invoiceId: string;
  lines: LineSummary[];
  attachments: AttachmentSummary[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [targetLineId, setTargetLineId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const extras = attachments.filter(
    (a) => !a.line_item_id || !lines.some((li) => li.id === a.line_item_id)
  );
  const forLine = (lineId: string) => attachments.filter((a) => a.line_item_id === lineId);
  const missing = lines.filter((li) => forLine(li.id).length === 0).length;

  function pickFile(lineId: string | null) {
    setTargetLineId(lineId);
    fileInput.current?.click();
  }

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      if (targetLineId) fd.set("line_item_id", targetLineId);
      const res = await fetch(`/api/invoices/${invoiceId}/attachments`, {
        method: "POST",
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Upload failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function remove(attachmentId: string) {
    setError(null);
    const fd = new FormData();
    fd.set("project_id", projectId);
    fd.set("invoice_id", invoiceId);
    fd.set("attachment_id", attachmentId);
    startTransition(async () => {
      try {
        await deleteInvoiceAttachment(fd);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not remove the file.");
      }
    });
  }

  return (
    <div className="app-card p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h3 className="app-h2 !text-[16px]">Backup invoices</h3>
        {missing > 0 ? (
          <span className="app-badge app-badge-red">
            {missing} line{missing === 1 ? "" : "s"} missing a backup
          </span>
        ) : lines.length > 0 ? (
          <span className="app-badge app-badge-green">All lines have backups ✓</span>
        ) : null}
      </div>
      <p className="text-sm app-muted mb-5 max-w-lg">
        Attach the invoice behind each line — the PDF the vendor or sub sent you. They print
        behind the cover sheet in the invoice packet, and the invoice total is the sum of these
        backups.
      </p>

      <input
        ref={fileInput}
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      <ul className="divide-y divide-navy/[0.06]">
        {lines.map((li) => {
          const files = forLine(li.id);
          return (
            <li key={li.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-navy/85 truncate">
                    {li.description}
                    {li.reference_number ? (
                      <span className="app-muted"> · Inv. #{li.reference_number}</span>
                    ) : null}
                  </p>
                  <p className="text-xs app-muted app-num">{formatMoneyExact(li.amount)}</p>
                </div>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => pickFile(li.id)}
                  className="app-btn app-btn-secondary !h-8 !px-3 !text-[12px] shrink-0"
                >
                  {uploading ? "Uploading…" : files.length ? "Attach another" : "Attach backup"}
                </button>
              </div>
              {files.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {files.map((f) => (
                    <li key={f.id} className="flex items-center gap-2 text-[13px] text-navy/70">
                      <span className="text-emerald-600">✓</span>
                      <span className="truncate">{f.file_name}</span>
                      <button
                        type="button"
                        onClick={() => remove(f.id)}
                        className="ml-auto text-xs text-stone-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 pt-3 border-t border-navy/[0.06]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs app-muted">
            Other paperwork for this invoice (not tied to one line)
          </p>
          <button
            type="button"
            disabled={uploading}
            onClick={() => pickFile(null)}
            className="app-btn app-btn-ghost !h-8 !px-3 !text-[12px]"
          >
            + Add file
          </button>
        </div>
        {extras.length > 0 && (
          <ul className="mt-2 space-y-1">
            {extras.map((f) => (
              <li key={f.id} className="flex items-center gap-2 text-[13px] text-navy/70">
                <span className="text-emerald-600">✓</span>
                <span className="truncate">{f.file_name}</span>
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  className="ml-auto text-xs text-stone-400 hover:text-red-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
