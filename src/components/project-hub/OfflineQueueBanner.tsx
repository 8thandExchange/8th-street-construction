"use client";

import { useEffect, useState, useTransition } from "react";
import { describeQueue, type OfflineCapture } from "@/lib/field/offline-queue";
import {
  discardFailedCaptures,
  discardQueuedCapture,
  listQueuedCaptures,
  syncBrowserQueue,
} from "@/lib/field/offline-browser";
import { subscribeOfflineQueue } from "@/lib/field/offline-store";
import { useOnline } from "./useOnline";

export function OfflineQueueBanner({ projectId }: { projectId?: string }) {
  const online = useOnline();
  const [items, setItems] = useState<OfflineCapture[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const listed = await listQueuedCaptures();
        if (!cancelled) {
          setItems(projectId ? listed.filter((item) => item.projectId === projectId) : listed);
        }
      } catch {
        if (!cancelled) setItems([]);
      }
    }
    refresh();
    return subscribeOfflineQueue(() => {
      void refresh();
    });
  }, [projectId]);

  if (items.length === 0) return null;
  const summary = describeQueue(items);

  return (
    <div
      role="status"
      className="mb-4 rounded-lg border border-copper/30 bg-copper/[0.06] px-4 py-3 text-sm text-navy"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>
          {online ? summary.label : `${summary.label} · this phone is offline`}
          {summary.photos > 0 ? ` · ${summary.photos} photo${summary.photos === 1 ? "" : "s"}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          {online && (
            <button
              type="button"
              className="app-btn app-btn-secondary !h-8"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await syncBrowserQueue();
                })
              }
            >
              {pending ? "Sending…" : "Send now"}
            </button>
          )}
          {summary.failed > 0 && (
            <button
              type="button"
              className="app-btn app-btn-ghost !h-8"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await discardFailedCaptures();
                })
              }
            >
              Discard failed
            </button>
          )}
        </div>
      </div>
      {items.some((item) => item.lastError) && (
        <ul className="mt-2 space-y-1 text-xs text-navy/80">
          {items
            .filter((item) => item.lastError)
            .map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{item.lastError}</span>
                <button
                  type="button"
                  className="underline"
                  onClick={() =>
                    startTransition(async () => {
                      await discardQueuedCapture(item.id);
                    })
                  }
                >
                  Discard
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
