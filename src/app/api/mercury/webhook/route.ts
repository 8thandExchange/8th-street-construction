import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncAllOpenMercuryInvoices } from "@/lib/mercury/sync";

export const dynamic = "force-dynamic";

function verifyMercurySignature(payload: string, signatureHeader: string, secretKey: string) {
  const parts = signatureHeader.split(",");
  const timestamp = parts[0]?.split("=")[1];
  const signature = parts[1]?.split("=")[1];
  if (!timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto.createHmac("sha256", secretKey).update(signedPayload).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Mercury verifies reachability before revealing the signing secret. */
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "mercury-webhook" });
}

export async function POST(request: Request) {
  const body = await request.text();
  const secret = process.env.MERCURY_WEBHOOK_SECRET?.trim();

  // Bootstrap: Mercury won't show the secret until verify succeeds.
  if (!secret) {
    return NextResponse.json({ received: true, pending_secret: true });
  }

  const sig = (await headers()).get("mercury-signature") ?? (await headers()).get("Mercury-Signature");

  if (!sig || !verifyMercurySignature(body, sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { id?: string; resourceType?: string; operationType?: string };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.id) {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("mercury_webhook_events")
      .select("id")
      .eq("mercury_event_id", event.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    await admin.from("mercury_webhook_events").insert({
      mercury_event_id: event.id,
      event_type: `${event.resourceType ?? "unknown"}.${event.operationType ?? "update"}`,
      payload: JSON.parse(body),
    });
  }

  if (event.resourceType === "transaction") {
    await syncAllOpenMercuryInvoices();
  }

  return NextResponse.json({ received: true });
}
