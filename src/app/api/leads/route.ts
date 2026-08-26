import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { leadSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLeadNotification, sendLeadConfirmation } from "@/lib/email/resend";
import { clientIp, enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const h = await headers();
  const ip = clientIp(h);

  // Open to the internet, and each accepted lead sends two emails — cap per IP
  // before doing any parsing or I/O.
  const limited = await enforceRateLimit(
    "leads",
    ip,
    "You've sent several inquiries already. Please wait a few minutes and try again, or call us directly."
  );
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = leadSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const data = result.data;

  // Honeypot — silently accept but don't process
  if (data.website && data.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const userAgent = h.get("user-agent") || null;

  const supabase = createAdminClient();

  const { getDefaultOrgId } = await import("@/lib/org/default-org");
  const orgId = await getDefaultOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      org_id: orgId,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone || null,
      project_type: data.project_type || null,
      message: data.message,
      utm_source: data.utm_source || null,
      utm_medium: data.utm_medium || null,
      utm_campaign: data.utm_campaign || null,
      // clientIp() buckets unidentifiable callers as "unknown"; keep storing null.
      ip_address: ip === "unknown" ? null : ip,
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
