import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { bookingSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingNotification, sendBookingConfirmation } from "@/lib/email/resend";
import { clientIp, enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Same exposure as /api/leads: unauthenticated, inserts a row and emails twice.
  const limited = await enforceRateLimit(
    "bookings",
    clientIp(await headers()),
    "You've requested several consultations already. Please wait a few minutes and try again, or call us directly."
  );
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = bookingSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const data = result.data;
  if (data.website && data.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createAdminClient();

  const { getDefaultOrgId } = await import("@/lib/org/default-org");
  const orgId = await getDefaultOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const { data: booking, error } = await supabase
    .from("consultations")
    .insert({
      org_id: orgId,
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
