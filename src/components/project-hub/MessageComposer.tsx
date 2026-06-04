"use client";

import { useRef } from "react";
import { sendProjectMessage } from "@/lib/actions/messages";

export function MessageComposer({ projectId }: { projectId: string }) {
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      action={async (fd) => {
        await sendProjectMessage(fd);
        ref.current?.reset();
      }}
      className="border-t border-ink/15 pt-6 mt-6"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <label className="field-label">Reply to client</label>
      <textarea
        name="body"
        required
        rows={3}
        className="field-input mb-4"
        placeholder="Your message…"
      />
      <button
        type="submit"
        className="inline-flex h-10 items-center px-5 bg-ink text-bone hover:bg-copper font-mono text-[10px] tracking-[0.2em] uppercase transition-colors"
      >
        Send Message
      </button>
    </form>
  );
}
