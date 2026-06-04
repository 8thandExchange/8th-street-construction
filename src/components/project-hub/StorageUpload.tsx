"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type StorageUploadProps = {
  bucket: "project-updates" | "project-documents";
  projectId: string;
  accept?: string;
  multiple?: boolean;
  onComplete: (files: { path: string; publicUrl?: string; size: number; type: string }[]) => void;
  label?: string;
};

export function StorageUpload({
  bucket,
  projectId,
  accept,
  multiple = false,
  onComplete,
  label = "Upload files",
}: StorageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const results: { path: string; publicUrl?: string; size: number; type: string }[] = [];

    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
          upsert: false,
        });
        if (upErr) throw upErr;

        let publicUrl: string | undefined;
        if (bucket === "project-updates") {
          const { data } = supabase.storage.from(bucket).getPublicUrl(path);
          publicUrl = data.publicUrl;
        }
        results.push({ path, publicUrl, size: file.size, type: file.type });
      }
      onComplete(results);
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
          accept={accept}
          multiple={multiple}
          disabled={uploading}
          onChange={handleChange}
        />
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink">
          {uploading ? "Uploading…" : label}
        </span>
      </label>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
