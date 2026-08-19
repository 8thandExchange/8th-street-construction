"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/admin/SubmitButton";
import {
  addChecklistItem,
  deleteChecklistItem,
  setChecklistItemDone,
} from "@/lib/actions/task-checklist";

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  done_at: string | null;
  photo_path: string | null;
  /** Signed URL built server-side; null when there's no photo. */
  photo_url: string | null;
};

/**
 * The steps under a task, each provable by a field photo. The camera
 * button is the whole flow on a phone: tap, shoot, done — the photo is
 * the checkmark. Built for Robby: photographs first, typing second.
 */
export function ChecklistItems({
  taskId,
  projectId,
  items,
}: {
  taskId: string;
  projectId: string;
  items: ChecklistItem[];
}) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-2">
      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((item) => (
            <ChecklistRow
              key={item.id}
              item={item}
              projectId={projectId}
              onError={setError}
            />
          ))}
        </ul>
      )}

      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}

      {adding ? (
        <form
          action={async (fd) => {
            try {
              await addChecklistItem(fd);
              setError(null);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Couldn't add the step");
            }
            setAdding(false);
          }}
          className="mt-2 flex items-center gap-2"
        >
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="task_id" value={taskId} />
          <input
            name="label"
            required
            autoFocus
            placeholder="e.g. Corner insulation photographed before drywall"
            className="field-input flex-1 !py-1.5 text-xs"
          />
          <SubmitButton className="app-btn app-btn-secondary !h-8 !px-3 !text-xs">
            Add
          </SubmitButton>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="text-[13px] font-medium text-copper hover:underline"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-1.5 text-[13px] font-medium text-copper hover:underline"
        >
          + Step to verify
        </button>
      )}
    </div>
  );
}

function ChecklistRow({
  item,
  projectId,
  onError,
}: {
  item: ChecklistItem;
  projectId: string;
  onError: (message: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submitDone(done: boolean, photoPath?: string) {
    const fd = new FormData();
    fd.set("project_id", projectId);
    fd.set("id", item.id);
    fd.set("done", String(done));
    if (photoPath) fd.set("photo_path", photoPath);
    try {
      await setChecklistItemDone(fd);
      onError(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn't save the step");
    }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${projectId}/checklist/${item.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("project-documents")
        .upload(path, file, { upsert: false });
      if (error) throw error;
      await submitDone(true, path);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <li className="group/item flex items-center gap-2.5">
      <button
        type="button"
        disabled={busy}
        onClick={() => submitDone(!item.done)}
        className={`h-4 w-4 shrink-0 border text-[10px] leading-none flex items-center justify-center ${
          item.done
            ? "bg-copper border-copper text-bone"
            : "border-ink/30 hover:border-copper"
        }`}
        aria-label={item.done ? `Uncheck ${item.label}` : `Check ${item.label}`}
      >
        {item.done ? "✓" : ""}
      </button>

      <span
        className={`min-w-0 flex-1 text-xs ${
          item.done ? "app-muted line-through" : "text-ink/75"
        }`}
      >
        {item.label}
      </span>

      {item.photo_url && (
        <a
          href={item.photo_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-medium text-copper hover:underline shrink-0"
        >
          Photo
        </a>
      )}

      {/* capture="environment" opens the rear camera straight away on a
          phone — the tap-shoot-done flow. On desktop it's a file picker. */}
      <label
        className={`shrink-0 cursor-pointer p-1 ${
          busy ? "text-stone-300" : "text-ink/35 hover:text-copper"
        }`}
        title={item.photo_url ? "Replace the photo" : "Prove it with a photo"}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={busy}
          onChange={handlePhoto}
        />
        <Camera className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">
          {busy ? "Uploading photo" : `Photograph ${item.label}`}
        </span>
      </label>

      <form
        action={async (fd) => {
          try {
            await deleteChecklistItem(fd);
            onError(null);
          } catch (err) {
            onError(err instanceof Error ? err.message : "Couldn't remove the step");
          }
        }}
        className="shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity"
      >
        <input type="hidden" name="project_id" value={projectId} />
        <input type="hidden" name="id" value={item.id} />
        <button
          type="submit"
          className="text-xs text-red-700 hover:underline"
          title="Remove step"
        >
          ×
        </button>
      </form>
    </li>
  );
}
