"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { StorageUpload } from "./StorageUpload";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { createDailyLog } from "@/lib/actions/daily-logs";
import { draftDailyLog } from "@/lib/actions/ai-daily-log";
import { createClient } from "@/lib/supabase/client";
import { filesToHeldPhotos, queueFieldCapture, uploadHeldPhotos } from "@/lib/field/offline-browser";
import { shouldQueueCapture } from "@/lib/field/offline-queue";
import { useOnline } from "./useOnline";

export function DailyLogForm({ projectId, today }: { projectId: string; today: string }) {
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<
    { path: string; publicUrl?: string; caption: string }[]
  >([]);
  const [weather, setWeather] = useState("");
  const [summary, setSummary] = useState("");
  const [issues, setIssues] = useState("");
  const [heldFiles, setHeldFiles] = useState<File[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [queuedNotice, setQueuedNotice] = useState<string | null>(null);
  const [drafting, startDrafting] = useTransition();
  const online = useOnline();

  function handleDraft() {
    setAiError(null);
    startDrafting(async () => {
      const result = await draftDailyLog({
        projectId,
        notes,
        imageUrls: images.map((image) => image.publicUrl).filter(Boolean) as string[],
      });
      if (result.ok) {
        setSummary(result.draft.summary);
        setIssues(result.draft.issues || "");
        if (result.draft.weather) setWeather(result.draft.weather);
      } else {
        setAiError(result.error);
      }
    });
  }

  async function removeImage(path: string) {
    setImages((current) => current.filter((image) => image.path !== path));
    const supabase = createClient();
    await supabase.storage.from("project-updates").remove([path]);
  }

  return (
    <form
      action={async (fd) => {
        setSaveError(null);
        setQueuedNotice(null);
        const resetForm = () => {
          setNotes("");
          setImages([]);
          setHeldFiles([]);
          setWeather("");
          setSummary("");
          setIssues("");
        };
        const queue = async () => {
          await queueFieldCapture({
            projectId,
            kind: "daily_log",
            text: String(fd.get("summary") ?? summary),
            logDate: String(fd.get("log_date") ?? today),
            weather: String(fd.get("weather") ?? weather),
            crewCount: fd.get("crew_count") ? Number(fd.get("crew_count")) : null,
            issues: String(fd.get("issues") ?? issues),
            files: heldFiles,
            uploadedPaths: images.map((image) => ({ path: image.path, caption: image.caption })),
          });
          resetForm();
          setQueuedNotice("Saved on this phone. It will send when you're back online.");
        };
        if (shouldQueueCapture({ online })) {
          try {
            await queue();
          } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Could not save on this phone.");
          }
          return;
        }
        try {
          if (heldFiles.length > 0) {
            const uploaded = await uploadHeldPhotos(projectId, filesToHeldPhotos(heldFiles));
            fd.set(
              "images",
              JSON.stringify([
                ...images.map((image) => ({ path: image.path, caption: image.caption })),
                ...uploaded,
              ])
            );
          }
          const result = await createDailyLog(fd);
          if (result?.error) {
            if (shouldQueueCapture({ online: true, error: new Error(result.error) })) {
              await queue();
              return;
            }
            setSaveError(result.error);
            return;
          }
          resetForm();
        } catch (err) {
          if (shouldQueueCapture({ online: true, error: err })) {
            try {
              await queue();
              return;
            } catch (queueError) {
              setSaveError(queueError instanceof Error ? queueError.message : "Could not save on this phone.");
              return;
            }
          }
          setSaveError(err instanceof Error ? err.message : "Could not save the daily log.");
        }
      }}
      className="app-card mt-8 p-6 space-y-5"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <input
        type="hidden"
        name="images"
        value={JSON.stringify(
          images.map((image) => ({ path: image.path, caption: image.caption }))
        )}
      />

      {/* AI quick-capture */}
      <div className="border border-copper/30 bg-copper/5 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="app-label">Quick capture</span>
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
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Rough notes from the field — what happened today"
          className="field-input"
        />
        <StorageUpload
          bucket="project-updates"
          projectId={projectId}
          multiple
          accept="image/*"
          heldCount={heldFiles.length}
          label="Add jobsite photos"
          onComplete={(files) =>
            setImages((prev) => [
              ...prev,
              ...files.map((file) => ({ ...file, caption: "" })),
            ])
          }
          onHold={(files) => setHeldFiles((prev) => [...prev, ...files])}
        />
        {heldFiles.length > 0 && (
          <p className="text-xs app-muted">
            {heldFiles.length} photo{heldFiles.length === 1 ? "" : "s"} saved on this phone until
            you&apos;re back online.
          </p>
        )}
        {images.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {images.map((image, index) => (
              <div key={image.path} className="overflow-hidden rounded-lg border border-navy/10 bg-white">
                {image.publicUrl && (
                  <div className="relative aspect-[4/3] bg-navy/[0.04]">
                    <Image
                      src={image.publicUrl}
                      alt={image.caption || `Daily log photo ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 320px"
                    />
                  </div>
                )}
                <div className="flex items-start gap-2 p-2">
                  <input
                    type="text"
                    value={image.caption}
                    onChange={(event) =>
                      setImages((current) =>
                        current.map((item) =>
                          item.path === image.path
                            ? { ...item, caption: event.target.value }
                            : item
                        )
                      )
                    }
                    placeholder="Photo caption (optional)"
                    className="min-w-0 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(image.path)}
                    className="app-btn app-btn-ghost !h-9 !px-2 text-xs"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs app-muted leading-relaxed">
          Drop in shorthand and photos — AI writes the log below. Review before saving.
        </p>
        {aiError && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2">
            {aiError}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="field-label">Date</label>
          <input type="date" name="log_date" defaultValue={today} className="field-input" required />
        </div>
        <div>
          <label className="field-label">Weather</label>
          <input
            name="weather"
            className="field-input"
            placeholder="Weather conditions"
            value={weather}
            onChange={(e) => setWeather(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">Crew count</label>
          <input type="number" name="crew_count" min={0} className="field-input" />
        </div>
      </div>
      <div>
        <label className="field-label">Work completed *</label>
        <textarea
          name="summary"
          rows={4}
          className="field-input"
          required
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>
      <div>
        <label className="field-label">Issues / delays</label>
        <textarea
          name="issues"
          rows={2}
          className="field-input"
          value={issues}
          onChange={(e) => setIssues(e.target.value)}
        />
      </div>
      <SubmitButton>{online ? "Save Log" : "Save on this phone"}</SubmitButton>
      {queuedNotice && (
        <p role="status" className="text-sm text-navy">
          {queuedNotice}
        </p>
      )}
      {saveError && (
        <p role="alert" className="text-sm text-red-700">
          {saveError}
        </p>
      )}
    </form>
  );
}
