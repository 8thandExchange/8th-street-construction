"use client";

import { useState, useTransition } from "react";
import { Camera, ClipboardCheck, NotebookPen, Plus, X } from "lucide-react";
import { createDailyLog } from "@/lib/actions/daily-logs";
import { createInspection } from "@/lib/actions/inspections";
import { createPunchItem } from "@/lib/actions/punch-list";
import { filesToHeldPhotos, queueFieldCapture, uploadHeldPhotos } from "@/lib/field/offline-browser";
import { shouldQueueCapture } from "@/lib/field/offline-queue";
import { StorageUpload } from "./StorageUpload";
import { useOnline } from "./useOnline";
import { cn } from "@/lib/utils";

type Mode = "note" | "photo" | "issue" | "inspection";

const MODES: { id: Mode; label: string; icon: typeof NotebookPen }[] = [
  { id: "note", label: "Field note", icon: NotebookPen },
  { id: "photo", label: "Photo", icon: Camera },
  { id: "inspection", label: "Inspection", icon: ClipboardCheck },
  { id: "issue", label: "Issue", icon: Plus },
];

function todayInAugusta() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export function FieldQuickCapture({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("note");
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<{ path: string; caption?: string }[]>([]);
  const [heldFiles, setHeldFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const online = useOnline();

  function reset() {
    setText("");
    setPhotos([]);
    setHeldFiles([]);
    setError(null);
  }

  async function queueOnThisPhone() {
    await queueFieldCapture({
      projectId,
      kind: mode,
      text,
      logDate: todayInAugusta(),
      files: heldFiles,
      uploadedPaths: photos,
    });
    reset();
    setOpen(false);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      if (mode === "issue" && !text.trim()) {
        setError("Describe the issue.");
        return;
      }
      if (mode === "inspection" && !text.trim()) {
        setError("Name the inspection.");
        return;
      }
      if (shouldQueueCapture({ online })) {
        try {
          await queueOnThisPhone();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save on this phone.");
        }
        return;
      }
      try {
        let uploaded = photos;
        if (heldFiles.length > 0) {
          uploaded = [
            ...photos,
            ...(await uploadHeldPhotos(projectId, filesToHeldPhotos(heldFiles))),
          ];
        }
        const form = new FormData();
        form.set("project_id", projectId);
        if (mode === "note" || mode === "photo") {
          form.set("log_date", todayInAugusta());
          form.set("summary", text.trim() || (mode === "photo" ? "Field photo" : "Field note"));
          form.set("images", JSON.stringify(uploaded));
          const result = await createDailyLog(form);
          if (result && "error" in result && result.error) {
            if (shouldQueueCapture({ online: true, error: new Error(result.error) })) {
              await queueOnThisPhone();
              return;
            }
            setError(result.error);
            return;
          }
        } else if (mode === "issue") {
          form.set("title", text.trim());
          await createPunchItem(form);
        } else {
          form.set("title", text.trim());
          form.set("scheduled_date", todayInAugusta());
          await createInspection(form);
        }
        reset();
        setOpen(false);
      } catch (err) {
        if (shouldQueueCapture({ online: true, error: err })) {
          try {
            await queueOnThisPhone();
            return;
          } catch (queueError) {
            setError(queueError instanceof Error ? queueError.message : "Could not save on this phone.");
            return;
          }
        }
        setError(err instanceof Error ? err.message : "Could not save the capture.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-navy px-4 text-sm font-medium text-white shadow-lg lg:bottom-6 lg:right-8"
      >
        <Camera size={16} strokeWidth={1.75} />
        Capture
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-3 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="field-capture-title"
            className="w-full max-w-md rounded-xl border border-navy/10 bg-white p-4 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 id="field-capture-title" className="text-[15px] font-semibold text-navy">
                Field capture
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="app-btn app-btn-ghost !h-8 !w-8 !p-0"
                aria-label="Close capture"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {MODES.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMode(item.id);
                      setError(null);
                    }}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13px]",
                      mode === item.id
                        ? "border-copper/40 bg-copper/[0.06] text-navy"
                        : "border-navy/10 text-navy/70"
                    )}
                  >
                    <Icon size={14} strokeWidth={1.75} />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="field-input"
              placeholder={
                mode === "inspection"
                  ? "Inspection name — rough-in, insulation, final…"
                  : mode === "issue"
                    ? "What needs attention, and where?"
                    : "What happened on site?"
              }
            />
            {(mode === "photo" || mode === "note") && (
              <div className="mt-3">
                <StorageUpload
                  bucket="project-updates"
                  projectId={projectId}
                  accept="image/*"
                  multiple
                  heldCount={heldFiles.length}
                  label={mode === "photo" ? "Add photos" : "Optional photos"}
                  onComplete={(files) =>
                    setPhotos((prev) => [...prev, ...files.map((file) => ({ path: file.path }))])
                  }
                  onHold={(files) => setHeldFiles((prev) => [...prev, ...files])}
                />
                {(photos.length > 0 || heldFiles.length > 0) && (
                  <p className="mt-2 text-[12px] app-muted">
                    {photos.length + heldFiles.length} photo(s)
                    {heldFiles.length > 0 ? " saved on this phone" : " attached"}
                  </p>
                )}
              </div>
            )}
            {!online && (
              <p className="mt-3 text-[12px] app-muted">
                No signal — this will stay on the phone until you&apos;re back online.
              </p>
            )}
            {error && <p className="mt-3 text-[13px] text-red-700">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="app-btn app-btn-ghost">
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="app-btn app-btn-primary"
              >
                {pending ? "Saving…" : online ? "Save" : "Save on this phone"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
