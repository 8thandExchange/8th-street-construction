import { createClient } from "@/lib/supabase/client";
import { createDailyLog } from "@/lib/actions/daily-logs";
import { createInspection } from "@/lib/actions/inspections";
import { createPunchItem } from "@/lib/actions/punch-list";
import { buildOfflineCapture, newCaptureId, type OfflineCaptureKind } from "./offline-queue";
import { createIndexedDbStore, type HeldPhoto } from "./offline-store";
import { enqueueCapture, syncOfflineQueue } from "./offline-sync";

const store = createIndexedDbStore();

export async function listQueuedCaptures() {
  return store.list();
}

export async function discardQueuedCapture(id: string) {
  await store.remove(id);
}

export async function discardFailedCaptures() {
  const items = await store.list();
  await Promise.all(items.filter((item) => item.status === "failed").map((item) => store.remove(item.id)));
}

export async function uploadHeldPhotos(
  projectId: string,
  photos: HeldPhoto[]
): Promise<{ path: string; caption?: string }[]> {
  const supabase = createClient();
  const uploaded: { path: string; caption?: string }[] = [];
  for (const photo of photos) {
    const ext = photo.name.split(".").pop() || "jpg";
    const path = `${projectId}/${Date.now()}-offline-${photo.id.slice(0, 8)}.${ext}`;
    const { error } = await supabase.storage.from("project-updates").upload(path, photo.blob, {
      upsert: false,
      contentType: photo.type || "image/jpeg",
    });
    if (error) throw error;
    uploaded.push({ path, caption: photo.name });
  }
  return uploaded;
}

export function filesToHeldPhotos(files: File[]): HeldPhoto[] {
  return files.map((file) => ({
    id: newCaptureId(),
    blob: file,
    name: file.name,
    type: file.type || "image/jpeg",
  }));
}

export async function queueFieldCapture(input: {
  projectId: string;
  kind: OfflineCaptureKind;
  text: string;
  logDate?: string;
  weather?: string;
  crewCount?: number | null;
  issues?: string;
  files?: File[];
  uploadedPaths?: { path: string; caption?: string }[];
}) {
  const photos = filesToHeldPhotos(input.files ?? []);
  const capture = buildOfflineCapture({
    projectId: input.projectId,
    kind: input.kind,
    text: input.text,
    logDate: input.logDate,
    weather: input.weather,
    crewCount: input.crewCount,
    issues: input.issues,
    photoIds: photos.map((photo) => photo.id),
    uploadedPaths: input.uploadedPaths,
  });
  return enqueueCapture(store, capture, photos);
}

let inFlight: Promise<{ sent: number; failed: number }> | null = null;

export async function syncBrowserQueue() {
  if (inFlight) return inFlight;
  inFlight = syncOfflineQueue({
    store,
    uploadPhoto: async (projectId, photo) => {
      const [uploaded] = await uploadHeldPhotos(projectId, [photo]);
      return uploaded.path;
    },
    createDailyLog,
    createPunchItem,
    createInspection,
  }).finally(() => {
    inFlight = null;
  });
  return inFlight;
}
