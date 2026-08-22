import {
  dailyLogSummary,
  friendlySyncError,
  isAuthFailure,
  mergeSameDayLogs,
  type OfflineCapture,
} from "./offline-queue";
import type { HeldPhoto, OfflineStore } from "./offline-store";

export type OfflineSyncDeps = {
  store: OfflineStore;
  uploadPhoto: (projectId: string, photo: HeldPhoto) => Promise<string>;
  createDailyLog: (form: FormData) => Promise<{ error?: string; ok?: boolean } | void>;
  createPunchItem: (form: FormData) => Promise<void>;
  createInspection: (form: FormData) => Promise<void>;
};

export async function enqueueCapture(
  store: OfflineStore,
  capture: OfflineCapture,
  photos: HeldPhoto[] = []
): Promise<OfflineCapture> {
  for (const existing of await store.list()) {
    const merged = mergeSameDayLogs(existing, capture);
    if (merged) {
      await store.put(merged, photos);
      return merged;
    }
  }
  await store.put(capture, photos);
  return capture;
}

export async function syncOfflineQueue(deps: OfflineSyncDeps): Promise<{ sent: number; failed: number }> {
  const items = await deps.store.list();
  let sent = 0;
  let failed = 0;

  for (const item of items) {
    await deps.store.mark(item.id, "syncing");
    try {
      const paths = [...item.uploadedPaths];
      for (const photoId of item.photoIds) {
        const photo = await deps.store.getPhoto(photoId);
        if (!photo) throw new Error("A queued photo is missing from this phone.");
        const path = await deps.uploadPhoto(item.projectId, photo);
        paths.push({ path, caption: photo.name });
      }
      await sendCapture(deps, item, paths);
      await deps.store.remove(item.id);
      sent += 1;
    } catch (error) {
      if (isAuthFailure(error)) {
        await deps.store.mark(item.id, "pending");
        continue;
      }
      await deps.store.mark(item.id, "failed", friendlySyncError(error));
      failed += 1;
    }
  }

  return { sent, failed };
}

async function sendCapture(
  deps: OfflineSyncDeps,
  item: OfflineCapture,
  paths: { path: string; caption?: string }[]
) {
  const form = new FormData();
  form.set("project_id", item.projectId);

  if (item.kind === "issue") {
    form.set("title", item.text);
    await deps.createPunchItem(form);
    return;
  }
  if (item.kind === "inspection") {
    form.set("title", item.text);
    if (item.logDate) form.set("scheduled_date", item.logDate);
    await deps.createInspection(form);
    return;
  }

  form.set("log_date", item.logDate ?? "");
  form.set("summary", dailyLogSummary(item));
  if (item.weather) form.set("weather", item.weather);
  if (item.issues) form.set("issues", item.issues);
  if (item.crewCount != null) form.set("crew_count", String(item.crewCount));
  form.set("images", JSON.stringify(paths.map(({ path, caption }) => ({ path, caption }))));
  const result = await deps.createDailyLog(form);
  if (result && "error" in result && result.error) {
    throw new Error(result.error);
  }
}
