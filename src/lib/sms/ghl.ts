/**
 * SMS via GoHighLevel (LeadConnector). Uses a Private Integration token +
 * location ID. Every send is best-effort: a missing config or API failure
 * never breaks the calling flow — email remains the primary channel.
 */

const GHL_BASE = "https://services.leadconnectorhq.com";

export function ghlConfigured() {
  return Boolean(process.env.GHL_API_TOKEN?.trim() && process.env.GHL_LOCATION_ID?.trim());
}

/** Loose E.164 normalization for US numbers ("(706) 555-0123" → "+17065550123"). */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.trim().startsWith("+") && digits.length >= 10) return `+${digits}`;
  return null;
}

async function ghlFetch<T>(path: string, version: string, body: unknown): Promise<T> {
  const res = await fetch(`${GHL_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GHL_API_TOKEN!.trim()}`,
      Version: version,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GHL ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

/**
 * Send an SMS to a phone number through GoHighLevel. Upserts the contact by
 * phone in the configured location, then posts an SMS message to it.
 * Returns { sent: false } (never throws) when unconfigured or on failure.
 */
export async function sendSms(payload: {
  phone: string | null | undefined;
  message: string;
  firstName?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!ghlConfigured()) return { sent: false, reason: "not_configured" };
  if (!payload.phone) return { sent: false, reason: "no_phone" };

  const phone = normalizePhone(payload.phone);
  if (!phone) return { sent: false, reason: "invalid_phone" };

  try {
    const upsert = await ghlFetch<{ contact?: { id?: string } }>(
      "/contacts/upsert",
      "2021-07-28",
      {
        locationId: process.env.GHL_LOCATION_ID!.trim(),
        phone,
        ...(payload.firstName ? { firstName: payload.firstName } : {}),
      }
    );

    const contactId = upsert.contact?.id;
    if (!contactId) return { sent: false, reason: "no_contact_id" };

    await ghlFetch("/conversations/messages", "2021-04-15", {
      type: "SMS",
      contactId,
      message: payload.message,
    });

    return { sent: true };
  } catch (err) {
    console.error("GHL SMS send failed:", err);
    return { sent: false, reason: "api_error" };
  }
}

/** SMS the builder/admin phone (GHL_ADMIN_SMS_TO) about a client action. */
export async function sendAdminSms(message: string) {
  return sendSms({ phone: process.env.GHL_ADMIN_SMS_TO, message });
}
