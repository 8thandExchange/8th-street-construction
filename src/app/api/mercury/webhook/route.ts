import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncAllOpenMercuryInvoices } from "@/lib/mercury/sync";
import { syncVendorBillsForTransaction } from "@/lib/mercury/vendor-sync";

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

  // Mercury won't reveal the signing secret until the endpoint verifies, so
  // this path has to exist — but it accepts unsigned POSTs, so fail closed
  // with a 503 rather than a silent 200. A missing MERCURY_WEBHOOK_SECRET in
  // prod is a misconfiguration that should be loud. The GET handler above is
  // what Mercury's reachability check actually hits during bootstrap.
  if (!secret) {
    console.error("[mercury-webhook] MERCURY_WEBHOOK_SECRET is not set — rejecting unsigned delivery");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 503 }
    );
  }

  const sig = (await headers()).get("mercury-signature") ?? (await headers()).get("Mercury-Signature");

  if (!sig || !verifyMercurySignature(body, sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    id?: string;
    resourceType?: string;
    operationType?: string;
    resourceId?: string;
  };
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
    // Receivables and payables are independent — one failing must not stop the
    // other, and neither may fail the webhook (Mercury would retry forever).
    const results = await Promise.allSettled([
      syncAllOpenMercuryInvoices(),
      syncVendorBillsForTransaction(event.resourceId),
    ]);
    for (const result of results) {
      if (result.status === "rejected") {
        console.error("Mercury webhook sync failed:", result.reason);
      }
    }
  }

  return NextResponse.json({ received: true });
}
