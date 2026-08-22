"use client";

import { useRef, useState } from "react";
import { clientCreateServiceRequest } from "@/lib/actions/service-requests";

export function ClientServiceRequestForm({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="app-btn app-btn-primary">
        Report an issue
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setSaving(true);
        setError(null);
        const result = await clientCreateServiceRequest(formData);
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
        <label htmlFor="client-service-title" className="field-label">
          What needs attention? *
        </label>
        <input id="client-service-title" name="title" required className="field-input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="client-service-location" className="field-label">
            Location
          </label>
          <input
            id="client-service-location"
            name="location"
            className="field-input"
            placeholder="Kitchen sink, front door…"
          />
        </div>
        <div>
          <label htmlFor="client-service-category" className="field-label">
            Type
          </label>
          <select id="client-service-category" name="category" className="field-input" defaultValue="warranty">
            <option value="warranty">Something we already built</option>
            <option value="service">Extra work</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="client-service-description" className="field-label">
          Details *
        </label>
        <textarea id="client-service-description" name="description" required rows={3} className="field-input" />
      </div>
      <div>
        <label htmlFor="client-service-photo" className="field-label">
          Photo
        </label>
        <input
          id="client-service-photo"
          name="photo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="field-input"
        />
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className="app-btn app-btn-primary">
          {saving ? "Sending…" : "Send to the team"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="app-btn app-btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}
