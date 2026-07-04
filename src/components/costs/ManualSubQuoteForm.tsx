"use client";

import { useState } from "react";
import { StorageUpload } from "@/components/project-hub/StorageUpload";
import { createProjectDocument } from "@/lib/actions/documents";
import { recordManualSubQuote } from "@/lib/actions/bids";

type ManualSubQuoteFormProps = {
  projectId: string;
  estimateLines: { id: string; trade_label: string; division_code: string }[];
  subcontractors: { id: string; company_name: string; trade: string }[];
};

export function ManualSubQuoteForm({
  projectId,
  estimateLines,
  subcontractors,
}: ManualSubQuoteFormProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<{ path: string; size: number; type: string } | null>(null);
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="app-btn app-btn-accent"
      >
        + Enter sub quote (no login needed)
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        setPending(true);
        try {
          if (file) {
            const docFd = new FormData();
            docFd.set("project_id", projectId);
            docFd.set(
              "title",
              `${String(fd.get("company_name"))} — ${String(fd.get("trade"))} quote`
            );
            docFd.set("storage_path", file.path);
            docFd.set("file_size_bytes", String(file.size));
            docFd.set("file_type", file.type);
            docFd.set("category", "sub_quote");
            docFd.set("visibility", "internal");
            const docRes = await createProjectDocument(docFd);
            if (docRes && "error" in docRes && docRes.error) throw new Error(docRes.error);
            if (docRes && "id" in docRes && docRes.id) {
              fd.set("document_id", docRes.id);
            }
          }
          await recordManualSubQuote(fd);
          setOpen(false);
          setFile(null);
        } finally {
          setPending(false);
        }
      }}
      className="hub-panel p-6 md:p-8 space-y-5 mb-10 border-copper/20"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <div>
        <h3 className="font-display text-lg text-ink">Enter a sub quote</h3>
        <p className="text-sm text-ink/55 mt-1 leading-relaxed">
          Subs don&apos;t need to log in. Type in what they quoted, scan the PDF, and save it here.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="field-label">Sub company *</label>
          <input name="company_name" list="sub-list" required className="field-input" placeholder="Company name" />
          <datalist id="sub-list">
            {subcontractors.map((s) => (
              <option key={s.id} value={s.company_name} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="field-label">Or pick from directory</label>
          <select name="subcontractor_id" className="field-input" defaultValue="">
            <option value="">— New or type above —</option>
            {subcontractors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.company_name} ({s.trade})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Trade *</label>
          <input name="trade" required className="field-input" placeholder="Trade" />
        </div>
        <div>
          <label className="field-label">Quote amount ($) *</label>
          <input type="number" name="amount" required min={1} step="1" className="field-input" />
        </div>
        <div className="md:col-span-2">
          <label className="field-label">What is this for?</label>
          <input name="title" className="field-input" placeholder="Scope of work title" />
        </div>
        <div className="md:col-span-2">
          <label className="field-label">Match to cost plan line</label>
          <select name="estimate_line_id" className="field-input" defaultValue="">
            <option value="">— Optional —</option>
            {estimateLines.map((l) => (
              <option key={l.id} value={l.id}>
                {l.trade_label} ({l.division_code})
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="field-label">Scan / PDF (optional)</label>
          <StorageUpload
            bucket="project-documents"
            projectId={projectId}
            onComplete={(files) => setFile(files[0] ?? null)}
            label={file ? "Quote file attached ✓" : "Upload scanned quote"}
          />
        </div>
        <div className="md:col-span-2 flex items-center gap-2">
          <input type="checkbox" name="award_now" id="award_now" className="accent-copper" />
          <label htmlFor="award_now" className="text-sm text-ink/70">
            This is the winning quote — lock it in on the cost plan
          </label>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-10 px-5 app-btn app-btn-primary"
        >
          {pending ? "Saving…" : "Save quote"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-10 px-5 app-btn app-btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
