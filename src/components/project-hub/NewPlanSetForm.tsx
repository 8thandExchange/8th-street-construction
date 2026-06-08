"use client";

import { useState } from "react";
import { StorageUpload } from "./StorageUpload";
import { createPlanSet } from "@/lib/actions/plan-sets";
import { PLAN_FILE_KINDS } from "@/lib/project/labels";

type UploadedFile = {
  path: string;
  size: number;
  type: string;
  title: string;
  kind: string;
};

export function NewPlanSetForm({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center px-5 bg-ink text-bone hover:bg-copper font-mono text-[10px] tracking-[0.2em] uppercase transition-colors"
      >
        + New Plan Set
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        fd.set(
          "files_json",
          JSON.stringify(
            files.map((f) => ({
              title: f.title,
              kind: f.kind,
              storage_path: f.path,
              file_type: f.type,
              file_size_bytes: f.size,
            }))
          )
        );
        await createPlanSet(fd);
        setOpen(false);
        setFiles([]);
      }}
      className="p-8 border border-ink/15 bg-paper space-y-5 mb-10"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <h3 className="eyebrow">New Plan / Rendering Set</h3>
      <p className="text-sm text-ink/60">
        Upload drawings and renderings. Local building regulations for this project&apos;s
        jurisdiction are attached automatically for the client record.
      </p>
      <div>
        <label className="field-label">Set Title *</label>
        <input
          name="title"
          required
          className="field-input"
          placeholder="e.g. Schematic Design — Rev A"
        />
      </div>
      <div>
        <label className="field-label">Description</label>
        <textarea
          name="description"
          rows={3}
          className="field-input"
          placeholder="Scope of this plan package, revision notes, etc."
        />
      </div>
      <div>
        <label className="field-label">Files *</label>
        <StorageUpload
          bucket="project-documents"
          projectId={projectId}
          multiple
          accept="image/*,.pdf,.dwg,.dxf"
          onComplete={(uploaded) => {
            setFiles((prev) => [
              ...prev,
              ...uploaded.map((u, i) => ({
                ...u,
                title: `File ${prev.length + i + 1}`,
                kind: "plan",
              })),
            ]);
          }}
          label={files.length ? `${files.length} file(s) uploaded — add more` : "Upload plans / renderings"}
        />
        {files.length > 0 && (
          <ul className="mt-4 space-y-3">
            {files.map((f, idx) => (
              <li key={f.path} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border border-ink/10">
                <input
                  className="field-input"
                  value={f.title}
                  onChange={(e) => {
                    const next = [...files];
                    next[idx] = { ...next[idx], title: e.target.value };
                    setFiles(next);
                  }}
                  placeholder="File title"
                />
                <select
                  className="field-input"
                  value={f.kind}
                  onChange={(e) => {
                    const next = [...files];
                    next[idx] = { ...next[idx], kind: e.target.value };
                    setFiles(next);
                  }}
                >
                  {PLAN_FILE_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                  className="text-[10px] font-mono uppercase text-stone-300 hover:text-red-600 text-left"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <label className="flex items-center gap-3 text-sm text-ink">
        <input type="checkbox" name="send_to_client" defaultChecked />
        Send to client for sign-off immediately
      </label>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!files.length}
          className="h-10 px-5 bg-ink text-bone disabled:opacity-40 font-mono text-[10px] tracking-[0.2em] uppercase"
        >
          Create Plan Set
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setFiles([]);
          }}
          className="h-10 px-5 border border-ink/20 font-mono text-[10px] uppercase"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
