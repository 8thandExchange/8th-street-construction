"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { basePlanStoragePath } from "@/lib/base-plans/paths";

type UploadedPdf = {
  path: string;
  size: number;
  type: string;
  fileName: string;
};

type BasePlanPdfUploadProps = {
  planNumber: string;
  variant?: string | null;
  onComplete: (file: UploadedPdf) => void;
  label?: string;
};

export function BasePlanPdfUpload({
  planNumber,
  variant = null,
  onComplete,
  label = "Upload PDF",
}: BasePlanPdfUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedPdf | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported");
      e.target.value = "";
      return;
    }

    if (!planNumber.trim()) {
      setError("Enter a plan number before uploading");
      e.target.value = "";
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
      const path = basePlanStoragePath(planNumber.trim().toUpperCase(), variant?.trim() || null, safeName);

      const { error: upErr } = await supabase.storage.from("project-documents").upload(path, file, {
        contentType: "application/pdf",
        upsert: true,
      });

      if (upErr) throw upErr;

      const result = { path, size: file.size, type: file.type, fileName: safeName };
      setUploaded(result);
      onComplete(result);
      e.target.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-3 border border-dashed border-ink/25 px-5 py-4 hover:border-copper/50 hover:bg-copper/5 transition-colors">
        <input
          type="file"
          className="sr-only"
          accept=".pdf,application/pdf"
          disabled={uploading}
          onChange={handleChange}
        />
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink">
          {uploading ? "Uploading…" : uploaded ? "PDF uploaded — replace" : label}
        </span>
      </label>
      {uploaded && (
        <p className="mt-2 text-xs text-emerald-700 font-mono">
          {uploaded.fileName} · {Math.round(uploaded.size / 1024)} KB
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
