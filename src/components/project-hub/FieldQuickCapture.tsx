"use client";

import { useState, useTransition } from "react";
import { Camera, ClipboardCheck, NotebookPen, Plus, X } from "lucide-react";
import { createDailyLog } from "@/lib/actions/daily-logs";
import { createInspection } from "@/lib/actions/inspections";
import { createPunchItem } from "@/lib/actions/punch-list";
import { StorageUpload } from "./StorageUpload";
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setText("");
    setPhotos([]);
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const form = new FormData();
        form.set("project_id", projectId);
        if (mode === "note" || mode === "photo") {
          form.set("log_date", todayInAugusta());
          form.set("summary", text.trim() || (mode === "photo" ? "Field photo" : "Field note"));
          form.set("images", JSON.stringify(photos));
          const result = await createDailyLog(form);
          if (result && "error" in result && result.error) {
            setError(result.error);
            return;
          }
        } else if (mode === "issue") {
          if (!text.trim()) {
            setError("Describe the issue.");
            return;
          }
          form.set("title", text.trim());
          await createPunchItem(form);
        } else {
          if (!text.trim()) {
            setError("Name the inspection.");
            return;
          }
          form.set("title", text.trim());
          form.set("scheduled_date", todayInAugusta());
          await createInspection(form);
        }
        reset();
        setOpen(false);
      } catch (err) {
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
                  label={mode === "photo" ? "Add photos" : "Optional photos"}
                  onComplete={(files) =>
                    setPhotos((prev) => [...prev, ...files.map((file) => ({ path: file.path }))])
                  }
                />
                {photos.length > 0 && (
                  <p className="mt-2 text-[12px] app-muted">{photos.length} photo(s) attached</p>
                )}
              </div>
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
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
