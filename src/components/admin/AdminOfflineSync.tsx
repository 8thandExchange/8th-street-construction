"use client";

import { useEffect } from "react";
import { syncBrowserQueue } from "@/lib/field/offline-browser";

/** Replays queued field captures when an admin session is back online. */
export function AdminOfflineSync() {
  useEffect(() => {
    const sync = () => {
      if (navigator.onLine === false) return;
      void syncBrowserQueue().catch(() => {
        // private mode or a still-offline save
      });
    };
    window.addEventListener("online", sync);
    sync();
    return () => window.removeEventListener("online", sync);
  }, []);
  return null;
}
