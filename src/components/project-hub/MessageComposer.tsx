"use client";

import { useRef, useState } from "react";
import { sendProjectMessage } from "@/lib/actions/messages";

export function MessageComposer({ projectId }: { projectId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      ref={ref}
      action={async (fd) => {
        setSaving(true);
        setError(null);
        const result = await sendProjectMessage(fd);
        setSaving(false);
        if (result?.error) {
          setError(result.error);
          return;
        }
        ref.current?.reset();
      }}
      className="border-t border-ink/15 pt-6 mt-6"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <label htmlFor="admin-message-body" className="field-label">Reply to client</label>
      <textarea
        id="admin-message-body"
        name="body"
        required
        rows={3}
        className="field-input mb-4"
        placeholder="Your message…"
      />
      <div className="mb-4">
        <label htmlFor="admin-message-attachment" className="field-label">Attachment</label>
        <input
          id="admin-message-attachment"
          type="file"
          name="attachment"
          accept=".pdf,image/png,image/jpeg,image/webp"
          className="block w-full text-sm text-navy/70 file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-2 file:text-xs file:font-medium file:text-white"
        />
        <p className="mt-1 text-xs app-muted">Optional PDF or image, up to 10 MB.</p>
      </div>
      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="app-btn app-btn-primary"
      >
        {saving ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
