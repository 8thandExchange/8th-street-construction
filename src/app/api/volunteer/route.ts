import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { volunteerSignupSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  sendVolunteerConfirmation,
  sendVolunteerNotification,
} from "@/lib/email/resend";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot — silently accept before validation so bots learn nothing
  if (typeof body?.website === "string" && body.website.length > 0) {
    return NextResponse.json({ ok: true, status: "confirmed" });
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`volunteer:${ip}`, 5, 60_000)) {
    return NextResponse.json({ ok: true, status: "confirmed" });
  }

  const result = volunteerSignupSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 }
    );
  }
  const data = result.data;

  const supabase = createAdminClient();

  const { data: event } = await supabase
    .from("volunteer_events")
    .select("*")
    .eq("id", data.event_id)
    .eq("published", true)
    .single();

  if (!event || event.status === "cancelled" || event.status === "completed") {
    return NextResponse.json(
      { error: "This build day is no longer open for signups." },
      { status: 404 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  if (event.event_date < today || (event.signup_deadline && event.signup_deadline < today)) {
    return NextResponse.json(
      { error: "Signups for this build day have closed." },
      { status: 400 }
    );
  }

  // Count confirmed spots to decide confirmed vs waitlist.
  const { data: existing } = await supabase
    .from("volunteer_signups")
    .select("group_size")
    .eq("event_id", event.id)
    .eq("status", "confirmed");

  const filled = (existing ?? []).reduce((sum, s) => sum + (s.group_size ?? 1), 0);
  const status: "confirmed" | "waitlist" =
    filled + data.group_size <= event.capacity ? "confirmed" : "waitlist";

  const { error } = await supabase.from("volunteer_signups").insert({
    event_id: event.id,
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone || null,
    group_size: data.group_size,
    experience_level: data.experience_level || null,
    notes: data.notes || null,
    status,
  });

  if (error) {
    if (error.code === "23505") {
      // Already signed up with this email — treat as success, don't dupe.
      return NextResponse.json({ ok: true, status: "confirmed", duplicate: true });
    }
    console.error("[volunteer] insert failed:", error);
    return NextResponse.json({ error: "Could not save signup" }, { status: 500 });
  }

  const spotsFilled = filled + (status === "confirmed" ? data.group_size : 0);

  // Mark the event full once confirmed spots hit capacity.
  if (status === "confirmed" && spotsFilled >= event.capacity && event.status === "scheduled") {
    await supabase.from("volunteer_events").update({ status: "full" }).eq("id", event.id);
  }

  const payload = {
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone,
    group_size: data.group_size,
    experience_level: data.experience_level,
    notes: data.notes,
    status,
    event_title: event.title,
    event_date: event.event_date,
    start_time: event.start_time,
    end_time: event.end_time,
    location: event.location,
    partner: event.partner,
    what_to_bring: event.what_to_bring,
    capacity: event.capacity,
    spots_filled: spotsFilled,
  };

  await Promise.allSettled([
    sendVolunteerConfirmation(payload),
    sendVolunteerNotification(payload),
  ]);

  return NextResponse.json({ ok: true, status });
}
