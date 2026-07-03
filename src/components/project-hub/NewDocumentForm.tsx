"use client";

import { useState } from "react";
import { StorageUpload } from "./StorageUpload";
import { createProjectDocument } from "@/lib/actions/documents";
import { DOCUMENT_CATEGORIES } from "@/lib/project/labels";

export function NewDocumentForm({ projectId }: { projectId: string }) {
  const [file, setFile] = useState<{
    path: string;
    size: number;
    type: string;
  } | null>(null);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center px-5 app-btn app-btn-primary"
      >
        + Upload Document
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        if (!file) return;
        fd.set("storage_path", file.path);
        fd.set("file_size_bytes", String(file.size));
        fd.set("file_type", file.type);
        await createProjectDocument(fd);
        setOpen(false);
        setFile(null);
      }}
      className="p-8 border border-ink/15 bg-paper space-y-5 mb-10"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <h3 className="eyebrow">Upload Document</h3>
      <div>
        <label className="field-label">Title *</label>
        <input name="title" required className="field-input" />
      </div>
      <div>
        <label className="field-label">Description</label>
        <input name="description" className="field-input" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="field-label">Category</label>
          <select name="category" className="field-input" defaultValue="other">
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Visibility</label>
          <select name="visibility" className="field-input" defaultValue="client">
            <option value="client">Client can view</option>
            <option value="internal">Internal only</option>
          </select>
        </div>
      </div>
      <StorageUpload
        bucket="project-documents"
        projectId={projectId}
        onComplete={(files) => setFile(files[0] ?? null)}
        label={file ? "File uploaded ✓" : "Choose file"}
      />
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!file}
          className="h-10 px-5 app-btn app-btn-primary"
        >
          Save
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
