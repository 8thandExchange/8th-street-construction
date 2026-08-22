"use client";

import { useRef, useState } from "react";
import { sendClientMessage } from "@/lib/actions/messages";

export function ClientMessageComposer({ projectId }: { projectId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      ref={ref}
      action={async (fd) => {
        setSaving(true);
        setError(null);
        const result = await sendClientMessage(fd);
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
      <label htmlFor="client-message-body" className="field-label">Your message</label>
      <textarea
        id="client-message-body"
        name="body"
        required
        rows={3}
        className="field-input mb-4"
        placeholder="Ask your project manager…"
      />
      <div className="mb-4">
        <label htmlFor="client-message-attachment" className="field-label">Attachment</label>
        <input
          id="client-message-attachment"
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
        className="app-btn app-btn-accent"
      >
        {saving ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
