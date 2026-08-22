"use client";

import { useRef, useState } from "react";
import { clientAddPunchComment } from "@/lib/actions/punch-list";

export function PunchCommentForm({
  projectId,
  itemId,
}: {
  projectId: string;
  itemId: string;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setSaving(true);
        setError(null);
        const result = await clientAddPunchComment(formData);
        setSaving(false);
        if (result?.error) {
          setError(result.error);
          return;
        }
        formRef.current?.reset();
      }}
      className="mt-4 flex flex-wrap items-start gap-2"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="item_id" value={itemId} />
      <label htmlFor={`punch-comment-${itemId}`} className="sr-only">
        Add a comment
      </label>
      <input
        id={`punch-comment-${itemId}`}
        name="body"
        maxLength={2000}
        placeholder="Add a comment or question"
        className="min-w-[220px] flex-1"
      />
      <button type="submit" disabled={saving} className="app-btn app-btn-secondary">
        {saving ? "Sending…" : "Comment"}
      </button>
      {error && <p role="alert" className="w-full text-xs text-red-700">{error}</p>}
    </form>
  );
}
