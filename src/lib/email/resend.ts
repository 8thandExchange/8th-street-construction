import { Resend } from "resend";
import { newLeadEmail } from "./templates/new-lead";
import { leadConfirmationEmail } from "./templates/lead-confirmation";
import { bookingConfirmationEmail } from "./templates/booking-confirmation";
import { volunteerConfirmationEmail } from "./templates/volunteer-confirmation";

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set — emails will be skipped");
    return null;
  }
  return new Resend(key);
}

const FROM = process.env.EMAIL_FROM || "8th Street Construction <onboarding@resend.dev>";
const TO_LEADS = process.env.EMAIL_TO_LEADS || "hello@8thstreetconstruction.com";

export type LeadEmailPayload = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  project_type?: string;
  message: string;
  created_at: string;
};

export async function sendLeadNotification(lead: LeadEmailPayload) {
  const c = client();
  if (!c) return { skipped: true };
  const { subject, html, text } = newLeadEmail(lead);
  return c.emails.send({
    from: FROM,
    to: TO_LEADS,
    replyTo: lead.email,
    subject,
    html,
    text,
  });
}

export async function sendLeadConfirmation(lead: LeadEmailPayload) {
  const c = client();
  if (!c) return { skipped: true };
  const { subject, html, text } = leadConfirmationEmail(lead);
  return c.emails.send({
    from: FROM,
    to: lead.email,
    replyTo: TO_LEADS,
    subject,
    html,
    text,
  });
}

export type BookingEmailPayload = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  meeting_type: string;
  preferred_date: string;
  preferred_time_window: string;
  project_type?: string;
  project_location?: string;
  notes?: string;
};

export async function sendBookingNotification(booking: BookingEmailPayload) {
  const c = client();
  if (!c) return { skipped: true };
  const { subject, html, text } = bookingConfirmationEmail(booking, "internal");
  return c.emails.send({
    from: FROM,
    to: TO_LEADS,
    replyTo: booking.email,
    subject,
    html,
    text,
  });
}

export async function sendBookingConfirmation(booking: BookingEmailPayload) {
  const c = client();
  if (!c) return { skipped: true };
  const { subject, html, text } = bookingConfirmationEmail(booking, "client");
  return c.emails.send({
    from: FROM,
    to: booking.email,
    replyTo: TO_LEADS,
    subject,
    html,
    text,
  });
}

export type VolunteerEmailPayload = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  group_size: number;
  experience_level?: string;
  notes?: string;
  status: "confirmed" | "waitlist";
  event_title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  partner: string;
  what_to_bring: string | null;
  capacity: number;
  spots_filled: number;
};

export async function sendVolunteerNotification(v: VolunteerEmailPayload) {
  const c = client();
  if (!c) return { skipped: true };
  const { subject, html, text } = volunteerConfirmationEmail(v, "internal");
  return c.emails.send({
    from: FROM,
    to: TO_LEADS,
    replyTo: v.email,
    subject,
    html,
    text,
  });
}

export async function sendVolunteerConfirmation(v: VolunteerEmailPayload) {
  const c = client();
  if (!c) return { skipped: true };
  const { subject, html, text } = volunteerConfirmationEmail(v, "volunteer");
  return c.emails.send({
    from: FROM,
    to: v.email,
    replyTo: TO_LEADS,
    subject,
    html,
    text,
  });
}
