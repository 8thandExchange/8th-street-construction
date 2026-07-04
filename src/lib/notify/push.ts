import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Web push to installed portal apps (PWA). Best-effort like SMS: missing
 * VAPID config or per-device failures never break the calling flow.
 */

export type PushPayload = {
  title: string;
  body: string;
  /** Path to open when the notification is tapped, e.g. /client/projects/x/messages */
  url?: string;
  /** Collapse key — newer notification replaces older with the same tag */
  tag?: string;
};

export function webPushConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim()
  );
}

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  webpush.setVapidDetails(
    `mailto:${process.env.EMAIL_TO_LEADS || "construction@8thandexchange.com"}`,
    process.env.VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim()
  );
  vapidReady = true;
}

async function sendToSubscriptions(
  subs: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload
) {
  if (!subs.length) return { sent: 0 };
  ensureVapid();
  const admin = createAdminClient();
  const body = JSON.stringify(payload);
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        // Subscription is gone (uninstalled / permission revoked) — clean up.
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Web push failed:", err);
        }
      }
    })
  );

  return { sent };
}

/** Push to every device a specific user has installed the portal on. */
export async function sendPushToProfile(profileId: string | null | undefined, payload: PushPayload) {
  if (!webPushConfigured() || !profileId) return { sent: 0 };
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("profile_id", profileId);
  return sendToSubscriptions(subs ?? [], payload);
}

/** Push to every admin device (client actions: messages, approvals). */
export async function sendPushToAdmins(payload: PushPayload) {
  if (!webPushConfigured()) return { sent: 0 };
  const admin = createAdminClient();
  const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin");
  const ids = (admins ?? []).map((a) => a.id);
  if (!ids.length) return { sent: 0 };
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("profile_id", ids);
  return sendToSubscriptions(subs ?? [], payload);
}
