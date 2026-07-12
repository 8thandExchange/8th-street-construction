import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { bookingSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingNotification, sendBookingConfirmation } from "@/lib/email/resend";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Rate limit — over-limit gets the same silent success as the honeypot
  // so throttling isn't revealed to bots.
  if (!checkRateLimit(ip, 5, 60_000)) {
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

  const result = bookingSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const data = result.data;

  const supabase = createAdminClient();

  const { data: booking, error } = await supabase
    .from("consultations")
    .insert({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      preferred_date: data.preferred_date,
      preferred_time_window: data.preferred_time_window,
      meeting_type: data.meeting_type,
      project_type: data.project_type || null,
      project_location: data.project_location || null,
      notes: data.notes || null,
      status: "requested",
    })
    .select("id")
    .single();

  if (error || !booking) {
    console.error("[bookings] insert failed:", error);
    return NextResponse.json({ error: "Could not save consultation" }, { status: 500 });
  }

  const payload = {
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone,
    meeting_type: data.meeting_type,
    preferred_date: data.preferred_date,
    preferred_time_window: data.preferred_time_window,
    project_type: data.project_type,
    project_location: data.project_location,
    notes: data.notes,
  };

  await Promise.allSettled([
    sendBookingNotification(payload),
    sendBookingConfirmation(payload),
  ]);

  return NextResponse.json({ ok: true, id: booking.id });
}
