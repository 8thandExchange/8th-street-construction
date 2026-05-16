import type { BookingEmailPayload } from "../resend";
import { PROJECT_CATEGORY_LABELS } from "@/lib/utils";

const TIME_WINDOW_LABELS: Record<string, string> = {
  morning: "Morning (8 AM – 12 PM)",
  afternoon: "Afternoon (12 PM – 5 PM)",
  evening: "Evening (5 PM – 7 PM)",
};

const MEETING_TYPE_LABELS: Record<string, string> = {
  phone: "Phone call",
  video: "Video call",
  in_person: "In-person meeting",
  site_visit: "On-site visit",
};

export function bookingConfirmationEmail(
  b: BookingEmailPayload,
  variant: "internal" | "client"
) {
  const meeting = MEETING_TYPE_LABELS[b.meeting_type] ?? b.meeting_type;
  const window = TIME_WINDOW_LABELS[b.preferred_time_window] ?? b.preferred_time_window;
  const projectType = b.project_type
    ? PROJECT_CATEGORY_LABELS[b.project_type] ?? b.project_type
    : "Not specified";

  if (variant === "internal") {
    const inner = `
      <h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px;font-weight:500;">${escapeHtml(b.first_name)} ${escapeHtml(b.last_name)} requested a consultation</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        ${[
          ["Meeting Type", meeting],
          ["Preferred Date", b.preferred_date],
          ["Time Window", window],
          ["Email", `<a href="mailto:${b.email}" style="color:#B86F3E;">${b.email}</a>`],
          ["Phone", `<a href="tel:${b.phone}" style="color:#B86F3E;">${b.phone}</a>`],
          ["Project Type", projectType],
          ["Project Location", b.project_location || "—"],
        ]
          .map(
            ([k, v]) => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #EBE3D2;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#7A746C;width:140px;vertical-align:top;">${k}</td>
            <td style="padding:10px 0;border-bottom:1px solid #EBE3D2;font-size:15px;">${v}</td>
          </tr>
        `
          )
          .join("")}
      </table>
      ${
        b.notes
          ? `<div><div style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#7A746C;margin-bottom:8px;">Notes</div><div style="background:#FBF9F5;padding:16px;border-radius:4px;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(b.notes)}</div></div>`
          : ""
      }
    `;
    return {
      subject: `Consultation request — ${b.first_name} ${b.last_name} — ${b.preferred_date}`,
      html: wrap(inner, "Consultation Request"),
      text: `${b.first_name} ${b.last_name} requested a ${meeting.toLowerCase()} on ${b.preferred_date} (${window}).
Email: ${b.email}
Phone: ${b.phone}
Project: ${projectType}${b.project_location ? ` — ${b.project_location}` : ""}
${b.notes ? `\nNotes: ${b.notes}` : ""}`,
    };
  }

  // Client variant
  const inner = `
    <h1 style="font-family:Georgia,serif;font-size:32px;font-weight:400;letter-spacing:-0.02em;line-height:1.15;margin:0 0 16px;">Consultation requested.</h1>
    <p style="font-size:16px;line-height:1.7;color:#374151;margin:0 0 24px;">
      ${escapeHtml(b.first_name)}, thanks for reaching out. We received your consultation request and will confirm a specific time within one business day.
    </p>
    <div style="background:#FBF9F5;border:1px solid #EBE3D2;padding:20px;border-radius:6px;margin:24px 0;">
      <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7A746C;margin-bottom:12px;">Your request</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;font-size:13px;color:#7A746C;width:120px;">Meeting</td><td style="padding:6px 0;font-size:14px;">${meeting}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#7A746C;">Preferred Date</td><td style="padding:6px 0;font-size:14px;">${b.preferred_date}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#7A746C;">Time Window</td><td style="padding:6px 0;font-size:14px;">${window}</td></tr>
      </table>
    </div>
    <p style="font-size:16px;line-height:1.7;color:#374151;">
      If you need to reach us sooner, reply directly to this email.
    </p>
  `;
  return {
    subject: "Consultation requested — 8th Street Construction",
    html: wrap(inner, "Consultation Requested"),
    text: `Thanks for reaching out. We received your consultation request and will confirm a specific time within one business day.

Meeting: ${meeting}
Preferred Date: ${b.preferred_date}
Time Window: ${window}

— 8th Street Construction`,
  };
}

const wrap = (inner: string, title: string) => `
<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#F5F1EA;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#0A0F14;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
    <div style="border-left:3px solid #B86F3E;padding-left:16px;margin-bottom:32px;">
      <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7A746C;">8th Street Construction</div>
    </div>
    ${inner}
    <div style="margin-top:48px;padding-top:24px;border-top:1px solid #DDD1B8;font-size:12px;color:#7A746C;text-align:center;">
      8th Street Construction · Augusta, Georgia · A division of 8th and Exchange Capital
    </div>
  </div>
</body></html>`;

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
