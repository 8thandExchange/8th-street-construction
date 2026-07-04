"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

type State = "unsupported" | "idle" | "enabled" | "denied" | "working";

/**
 * "Get notifications" button for the portal. On iPhone, web push only works
 * after the site is added to the Home Screen — we surface that hint.
 */
export function EnableNotificationsButton({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>("unsupported");
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      // iOS Safari outside an installed PWA: push unsupported, but installing fixes it
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as { standalone?: boolean }).standalone === true;
      if (isIos && !standalone) setShowIosHint(true);
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "enabled" : "idle");
    });
    setState("idle");
  }, []);

  async function enable() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return;
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "idle");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setState(res.ok ? "enabled" : "idle");
    } catch {
      setState("idle");
    }
  }

  if (showIosHint && !compact) {
    return (
      <p className="text-xs text-ink/50">
        📲 Tip: tap <span className="font-medium">Share → Add to Home Screen</span> to install
        this portal as an app and get notifications.
      </p>
    );
  }
  if (state === "unsupported" || state === "denied") return null;

  if (state === "enabled") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs ${compact ? "" : "text-ink/50"}`}
        title="Notifications are on for this device"
      >
        <BellRing size={13} className="text-copper" />
        {!compact && "Notifications on"}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={enable}
      disabled={state === "working"}
      className={
        compact
          ? "inline-flex items-center gap-1.5 text-xs text-ink/60 hover:text-copper transition-colors"
          : "inline-flex items-center gap-2 border border-ink/20 bg-paper px-3 py-1.5 text-xs text-ink hover:border-copper/50 transition-colors"
      }
    >
      <Bell size={13} />
      {state === "working" ? "Enabling…" : "Get notifications"}
    </button>
  );
}
