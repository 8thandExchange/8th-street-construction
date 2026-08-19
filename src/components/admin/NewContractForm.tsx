"use client";

import { useState } from "react";
import { StorageUpload } from "@/components/project-hub/StorageUpload";
import { createProjectDocument } from "@/lib/actions/documents";

export function NewContractForm({
  projects,
}: {
  projects: { id: string; title: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [file, setFile] = useState<{
    path: string;
    size: number;
    type: string;
  } | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="app-btn app-btn-primary"
      >
        + Add Contract
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        if (!file || !projectId) return;
        fd.set("storage_path", file.path);
        fd.set("file_size_bytes", String(file.size));
        fd.set("file_type", file.type);
        await createProjectDocument(fd);
        setOpen(false);
        setFile(null);
        setProjectId("");
      }}
      className="p-8 border border-ink/15 bg-paper space-y-5 mb-10"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="category" value="contract" />
      <h3 className="eyebrow">Add Contract</h3>
      <div>
        <label className="field-label">Job *</label>
        <select
          required
          className="field-input"
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setFile(null);
          }}
        >
          <option value="">Choose a job…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">Title *</label>
        <input name="title" required className="field-input" />
      </div>
      <div>
        <label className="field-label">Description</label>
        <input name="description" className="field-input" />
      </div>
      <div>
        <label className="field-label">Visibility</label>
        <select name="visibility" className="field-input" defaultValue="internal">
          <option value="internal">Internal only</option>
          <option value="client">Client can view</option>
        </select>
      </div>
      {projectId ? (
        <StorageUpload
          bucket="project-documents"
          projectId={projectId}
          accept="application/pdf,image/*"
          onComplete={(files) => setFile(files[0] ?? null)}
          label={file ? "File uploaded ✓" : "Choose file"}
        />
      ) : (
        <p className="text-sm text-ink/50 italic">Choose a job to enable the file upload.</p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!file || !projectId}
          className="app-btn app-btn-primary"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="app-btn app-btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
