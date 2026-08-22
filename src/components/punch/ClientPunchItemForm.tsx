"use client";

import { useRef, useState } from "react";
import { clientCreatePunchItem } from "@/lib/actions/punch-list";

export function ClientPunchItemForm({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="app-btn app-btn-primary">
        Add walkthrough item
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setSaving(true);
        setError(null);
        const result = await clientCreatePunchItem(formData);
        setSaving(false);
        if (result?.error) {
          setError(result.error);
          return;
        }
        formRef.current?.reset();
        setOpen(false);
      }}
      className="app-card mt-5 space-y-4 p-5"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <div>
        <label htmlFor="client-punch-title" className="field-label">
          What should the team review? *
        </label>
        <input id="client-punch-title" name="title" required className="field-input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="client-punch-location" className="field-label">Location</label>
          <input
            id="client-punch-location"
            name="location"
            placeholder="Kitchen, upstairs bath…"
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="client-punch-photo" className="field-label">Photo</label>
          <input
            id="client-punch-photo"
            type="file"
            name="photo"
            accept="image/png,image/jpeg,image/webp"
            className="block w-full text-sm text-navy/70 file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-2 file:text-xs file:font-medium file:text-white"
          />
        </div>
      </div>
      <div>
        <label htmlFor="client-punch-description" className="field-label">Details</label>
        <textarea
          id="client-punch-description"
          name="description"
          rows={3}
          className="field-input"
        />
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="app-btn app-btn-primary">
          {saving ? "Adding…" : "Add item"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => setOpen(false)}
          className="app-btn app-btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
