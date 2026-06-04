"use client";

import { useState } from "react";
import { StorageUpload } from "./StorageUpload";
import { createProjectUpdate } from "@/lib/actions/updates";

export function NewUpdateForm({ projectId }: { projectId: string }) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

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
      }}
      className="p-8 border border-copper/30 bg-copper/5 space-y-5 mb-10"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <h3 className="eyebrow">New Progress Update</h3>
      <div>
        <label className="field-label">Title *</label>
        <input name="title" required className="field-input" />
      </div>
      <div>
        <label className="field-label">Body</label>
        <textarea name="body" rows={5} className="field-input" />
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
