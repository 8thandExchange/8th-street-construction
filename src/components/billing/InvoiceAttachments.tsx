"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { attachInvoiceDocument, removeInvoiceAttachment } from "@/lib/actions/billing";

type AttachedDoc = { id: string; title: string };

/**
 * Attachments card on the invoice page. Files ride the invoice email to the
 * client and are filed in the project's Documents tab (category 'invoice').
 */
export function InvoiceAttachments({
  projectId,
  invoiceId,
  docs,
  sent,
}: {
  projectId: string;
  invoiceId: string;
  docs: AttachedDoc[];
  /** Invoice already sent — attachments become read-only reference */
  sent?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files).slice(0, 5)) {
        const form = new FormData();
        form.set("file", file);
        const res = await fetch("/api/assistant/upload", { method: "POST", body: form });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.storage_path) {
          setError(json?.error ?? `Upload failed for ${file.name}`);
          continue;
        }
        const fd = new FormData();
        fd.set("project_id", projectId);
        fd.set("invoice_id", invoiceId);
        fd.set("title", file.name);
        fd.set("storage_path", String(json.storage_path));
        const result = await attachInvoiceDocument(fd);
        if (result && "error" in result && result.error) setError(String(result.error));
      }
      router.refresh();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRemove(documentId: string) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("project_id", projectId);
      fd.set("invoice_id", invoiceId);
      fd.set("document_id", documentId);
      await removeInvoiceAttachment(fd);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="app-h2 !text-[15px]">Attachments</h3>
          <p className="mt-1 text-sm app-muted max-w-md">
            {sent
              ? "Documents that were emailed to the client with this invoice."
              : "Reports, certs, and backup docs — emailed to the client with the invoice and filed in Documents."}
          </p>
        </div>
        {!sent && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="app-btn app-btn-secondary !h-9 shrink-0"
            >
              {busy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Paperclip size={14} strokeWidth={1.75} />
              )}
              <span className="ml-1.5">Attach file</span>
            </button>
          </>
        )}
      </div>

      {docs.length > 0 && (
        <ul className="mt-4 divide-y divide-navy/[0.06]">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="flex min-w-0 items-center gap-2 text-sm text-navy/80">
                <FileText size={15} className="shrink-0 text-copper" />
                <span className="truncate">{doc.title}</span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <a
                  href={`/api/documents/${doc.id}/download`}
                  target="_blank"
                  className="text-[12px] font-medium text-copper hover:underline"
                >
                  View
                </a>
                {!sent && (
                  <button
                    type="button"
                    onClick={() => onRemove(doc.id)}
                    disabled={busy}
                    className="text-navy/40 transition-colors hover:text-red-600"
                    title="Remove attachment"
                  >
                    <X size={15} />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
