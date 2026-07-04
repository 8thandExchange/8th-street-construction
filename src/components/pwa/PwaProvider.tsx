"use client";

import { useEffect } from "react";

/** Registers the service worker once per page load. Safe no-op when unsupported. */
export function PwaProvider() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // registration failures are non-fatal (private mode, old browsers)
    });
  }, []);

  return null;
}
