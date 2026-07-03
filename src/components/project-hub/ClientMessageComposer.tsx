"use client";

import { useRef } from "react";
import { sendClientMessage } from "@/lib/actions/messages";

export function ClientMessageComposer({ projectId }: { projectId: string }) {
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      action={async (fd) => {
        await sendClientMessage(fd);
        ref.current?.reset();
      }}
      className="border-t border-ink/15 pt-6 mt-6"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <label className="field-label">Your message</label>
      <textarea
        name="body"
        required
        rows={3}
        className="field-input mb-4"
        placeholder="Ask your project manager…"
      />
      <button
        type="submit"
        className="inline-flex h-10 items-center px-5 app-btn app-btn-accent"
      >
        Send
      </button>
    </form>
  );
}
