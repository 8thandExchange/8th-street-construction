import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { leadSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLeadNotification, sendLeadConfirmation } from "@/lib/email/resend";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;
  const userAgent = h.get("user-agent") || null;

  // Rate limit — over-limit gets the same silent success as the honeypot
  // so throttling isn't revealed to bots.
  if (!checkRateLimit(ip || "unknown", 5, 60_000)) {
    return NextResponse.json({ ok: true });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot — check the raw body BEFORE validation so a filled honeypot
  // is silently accepted rather than bounced with a 400.
  const rawWebsite = (body as { website?: unknown } | null)?.website;
  if (typeof rawWebsite === "string" && rawWebsite.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const result = leadSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const data = result.data;

  const supabase = createAdminClient();

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone || null,
      project_type: data.project_type || null,
      message: data.message,
      utm_source: data.utm_source || null,
      utm_medium: data.utm_medium || null,
      utm_campaign: data.utm_campaign || null,
      ip_address: ip,
      user_agent: userAgent,
      status: "new",
    })
    .select("id, created_at")
    .single();

  if (error || !lead) {
    console.error("[leads] insert failed:", error);
    return NextResponse.json({ error: "Could not save inquiry" }, { status: 500 });
  }

  // Fire both emails — failure here shouldn't block the user response
  const payload = {
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone,
    project_type: data.project_type,
    message: data.message,
    created_at: lead.created_at,
  };

  await Promise.allSettled([
    sendLeadNotification(payload),
    sendLeadConfirmation(payload),
  ]);

  return NextResponse.json({ ok: true, id: lead.id });
}
