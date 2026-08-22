export const OFFLINE_CAPTURE_KINDS = [
  "note",
  "photo",
  "issue",
  "inspection",
  "daily_log",
] as const;

export type OfflineCaptureKind = (typeof OFFLINE_CAPTURE_KINDS)[number];

export type OfflineCaptureStatus = "pending" | "syncing" | "failed";

export type OfflineCapture = {
  id: string;
  projectId: string;
  kind: OfflineCaptureKind;
  createdAt: string;
  text: string;
  logDate?: string;
  weather?: string;
  crewCount?: number | null;
  issues?: string;
  photoIds: string[];
  uploadedPaths: { path: string; caption?: string }[];
  status: OfflineCaptureStatus;
  lastError?: string;
};

export const MAX_OFFLINE_PHOTOS = 10;
export const MAX_OFFLINE_PHOTO_BYTES = 8 * 1024 * 1024;

export function todayInTimeZone(timeZone = "America/New_York", now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone });
}

export function isLikelyOffline(online: boolean | undefined = globalThis.navigator?.onLine): boolean {
  return online === false;
}

export function isNetworkFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /failed to fetch|networkerror|load failed|offline|err_internet|err_name_not_resolved|the internet connection appears to be offline/i.test(
    message
  );
}

export function isAuthFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /not authenticated|unauthorized|this login cannot/i.test(message);
}

export function shouldQueueCapture(input: { online?: boolean; error?: unknown }): boolean {
  if (isLikelyOffline(input.online)) return true;
  if (input.error == null) return false;
  return isNetworkFailure(input.error);
}

export function friendlySyncError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "Could not send.");
  if (/unique|already exists|project_daily_logs.*log_date/i.test(message)) {
    return "A field note already exists for that day. Open Field Notes, add to it, then discard this queued one.";
  }
  return message;
}

export function newCaptureId(random: () => string = () => crypto.randomUUID()): string {
  return random();
}

export function buildOfflineCapture(input: {
  id?: string;
  projectId: string;
  kind: OfflineCaptureKind;
  text: string;
  createdAt?: string;
  logDate?: string;
  weather?: string;
  crewCount?: number | null;
  issues?: string;
  photoIds?: string[];
  uploadedPaths?: { path: string; caption?: string }[];
}): OfflineCapture {
  const kind = input.kind;
  const logDate =
    kind === "issue" || kind === "inspection" ? undefined : input.logDate ?? todayInTimeZone();
  return {
    id: input.id ?? newCaptureId(),
    projectId: input.projectId,
    kind,
    createdAt: input.createdAt ?? new Date().toISOString(),
    text: input.text.trim(),
    logDate,
    weather: input.weather?.trim() || undefined,
    crewCount: input.crewCount ?? null,
    issues: input.issues?.trim() || undefined,
    photoIds: input.photoIds ?? [],
    uploadedPaths: input.uploadedPaths ?? [],
    status: "pending",
  };
}

export function canHoldPhoto(file: { size: number }, alreadyHeld: number): string | null {
  if (alreadyHeld >= MAX_OFFLINE_PHOTOS) return `A capture can hold ${MAX_OFFLINE_PHOTOS} photos.`;
  if (file.size > MAX_OFFLINE_PHOTO_BYTES) return "That photo is larger than 8 MB.";
  return null;
}

export function mergeSameDayLogs(existing: OfflineCapture, incoming: OfflineCapture): OfflineCapture | null {
  const mergeable = new Set<OfflineCaptureKind>(["note", "photo", "daily_log"]);
  if (!mergeable.has(existing.kind) || !mergeable.has(incoming.kind)) return null;
  if (existing.projectId !== incoming.projectId) return null;
  if (!existing.logDate || existing.logDate !== incoming.logDate) return null;
  if (existing.status === "syncing") return null;

  const kind: OfflineCaptureKind =
    existing.kind === "daily_log" || incoming.kind === "daily_log" ? "daily_log" : incoming.kind;
  return {
    ...existing,
    kind,
    text: [existing.text, incoming.text].filter(Boolean).join("\n\n"),
    weather: incoming.weather || existing.weather,
    crewCount: incoming.crewCount ?? existing.crewCount,
    issues: [existing.issues, incoming.issues].filter(Boolean).join("\n") || undefined,
    photoIds: [...existing.photoIds, ...incoming.photoIds],
    uploadedPaths: [...existing.uploadedPaths, ...incoming.uploadedPaths],
    status: "pending",
    lastError: undefined,
  };
}

export function describeQueue(items: OfflineCapture[]): {
  pending: number;
  failed: number;
  photos: number;
  label: string;
} {
  const pending = items.filter((item) => item.status !== "failed").length;
  const failed = items.filter((item) => item.status === "failed").length;
  const photos = items.reduce((sum, item) => sum + item.photoIds.length + item.uploadedPaths.length, 0);
  const total = items.length;
  const noun = total === 1 ? "capture" : "captures";
  let label = `${total} field ${noun} waiting to send`;
  if (failed && pending) label = `${pending} waiting · ${failed} could not send`;
  else if (failed && !pending) label = `${failed} field ${noun} could not send`;
  return { pending, failed, photos, label };
}

export function dailyLogSummary(capture: OfflineCapture): string {
  return capture.text.trim() || (capture.kind === "photo" ? "Field photo" : "Field note");
}
