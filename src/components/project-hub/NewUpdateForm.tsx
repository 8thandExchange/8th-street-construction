"use client";

import { useState, useTransition } from "react";
import { StorageUpload } from "./StorageUpload";
import { createProjectUpdate } from "@/lib/actions/updates";
import { draftClientUpdate } from "@/lib/actions/ai-updates";

export function NewUpdateForm({ projectId }: { projectId: string }) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [drafting, startDrafting] = useTransition();

  function handleDraft() {
    setAiError(null);
    startDrafting(async () => {
      const result = await draftClientUpdate(projectId);
      if (result.ok) {
        setTitle(result.draft.title);
        setBody(result.draft.body);
      } else {
        setAiError(result.error);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center px-5 bg-ink text-bone hover:bg-copper font-mono text-[10px] tracking-[0.2em] uppercase transition-colors"
      >
        + Post Update
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        imageUrls.forEach((url) => fd.append("image_urls", url));
        await createProjectUpdate(fd);
        setOpen(false);
        setImageUrls([]);
        setTitle("");
        setBody("");
      }}
      className="p-8 border border-copper/30 bg-copper/5 space-y-5 mb-10"
    >
      <input type="hidden" name="project_id" value={projectId} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="eyebrow">New Progress Update</h3>
        <button
          type="button"
          onClick={handleDraft}
          disabled={drafting}
          className="inline-flex items-center gap-2 h-9 px-4 border border-copper/40 bg-paper text-copper font-mono text-[10px] tracking-[0.16em] uppercase hover:bg-copper hover:text-bone transition-colors disabled:opacity-50"
        >
          <span aria-hidden>✦</span>
          {drafting ? "Drafting…" : "Draft with AI"}
        </button>
      </div>

      {aiError && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2">
          {aiError}
        </p>
      )}
      <p className="text-xs text-ink/45 -mt-2 leading-relaxed">
        AI drafts from recent field logs and completed work — review and edit before publishing.
      </p>

      <div>
        <label className="field-label">Title *</label>
        <input
          name="title"
          required
          className="field-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label className="field-label">Body</label>
        <textarea
          name="body"
          rows={7}
          className="field-input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div>
        <label className="field-label mb-2 block">Photos</label>
        <StorageUpload
          bucket="project-updates"
          projectId={projectId}
          multiple
          accept="image/*"
          label="Add photos"
          onComplete={(files) =>
            setImageUrls((prev) => [
              ...prev,
              ...files.map((f) => f.publicUrl!).filter(Boolean),
            ])
          }
        />
        {imageUrls.length > 0 && (
          <p className="mt-2 text-xs font-mono text-stone-300">
            {imageUrls.length} image(s) ready
          </p>
        )}
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" name="notify_client" className="w-5 h-5 accent-copper" />
        <span className="text-sm text-ink">Email client when published</span>
      </label>
      <div className="flex gap-3">
        <button
          type="submit"
          className="h-10 px-5 bg-ink text-bone font-mono text-[10px] tracking-[0.2em] uppercase"
        >
          Publish
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-10 px-5 border border-ink/20 font-mono text-[10px] uppercase"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
