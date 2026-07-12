import type { VolunteerEmailPayload } from "../resend";

function fmtDate(d: string) {
  return new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return m ? `${hr}:${String(m).padStart(2, "0")} ${ampm}` : `${hr} ${ampm}`;
}

export function volunteerConfirmationEmail(
  v: VolunteerEmailPayload,
  variant: "internal" | "volunteer"
) {
  const date = fmtDate(v.event_date);
  const time = `${fmtTime(v.start_time)} – ${fmtTime(v.end_time)}`;
  const waitlisted = v.status === "waitlist";

  if (variant === "internal") {
    const inner = `
      <h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px;font-weight:500;">${escapeHtml(v.first_name)} ${escapeHtml(v.last_name)} signed up${waitlisted ? " (waitlist)" : ""} — ${escapeHtml(v.event_title)}</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        ${[
          ["Build Day", `${escapeHtml(v.event_title)} · ${date}`],
          ["Time", time],
          ["Email", `<a href="mailto:${v.email}" style="color:#B86F3E;">${v.email}</a>`],
          ["Phone", v.phone ? `<a href="tel:${v.phone}" style="color:#B86F3E;">${v.phone}</a>` : "—"],
          ["Group Size", String(v.group_size)],
          ["Experience", v.experience_level ?? "—"],
          ["Status", waitlisted ? "WAITLIST — day is at capacity" : "Confirmed"],
          ["Spots Now Filled", `${v.spots_filled} of ${v.capacity}`],
        ]
          .map(
            ([k, val]) => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #EBE3D2;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#7A746C;width:150px;vertical-align:top;">${k}</td>
            <td style="padding:10px 0;border-bottom:1px solid #EBE3D2;font-size:15px;">${val}</td>
          </tr>`
          )
          .join("")}
      </table>
      ${
        v.notes
          ? `<div><div style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#7A746C;margin-bottom:8px;">Notes</div><div style="background:#FBF9F5;padding:16px;border-radius:4px;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(v.notes)}</div></div>`
          : ""
      }
    `;
    return {
      subject: `Volunteer signup${waitlisted ? " (waitlist)" : ""} — ${v.first_name} ${v.last_name} — ${v.event_title}`,
      html: wrap(inner, "Volunteer Signup"),
      text: `${v.first_name} ${v.last_name} signed up for ${v.event_title} on ${date} (${time}).
Status: ${waitlisted ? "WAITLIST" : "Confirmed"} · Group of ${v.group_size} · ${v.spots_filled}/${v.capacity} spots filled
Email: ${v.email}${v.phone ? `\nPhone: ${v.phone}` : ""}${v.notes ? `\nNotes: ${v.notes}` : ""}`,
    };
  }

  // Volunteer variant
  const inner = waitlisted
    ? `
    <h1 style="font-family:Georgia,serif;font-size:32px;font-weight:400;letter-spacing:-0.02em;line-height:1.15;margin:0 0 16px;">You're on the list.</h1>
    <p style="font-size:16px;line-height:1.7;color:#374151;margin:0 0 24px;">
      ${escapeHtml(v.first_name)}, thank you — <strong>${escapeHtml(v.event_title)}</strong> on ${date} is currently at capacity, so we've added you to the waitlist. Build-day rosters shift often; if a spot opens we'll email you right away, at least 72 hours before the build.
    </p>
    ${detailsCard(v, date, time)}
    <p style="font-size:16px;line-height:1.7;color:#374151;">
      Want a guaranteed spot? Reply to this email and we'll get you onto the next scheduled build day.
    </p>
  `
    : `
    <h1 style="font-family:Georgia,serif;font-size:32px;font-weight:400;letter-spacing:-0.02em;line-height:1.15;margin:0 0 16px;">You're on the crew.</h1>
    <p style="font-size:16px;line-height:1.7;color:#374151;margin:0 0 24px;">
      ${escapeHtml(v.first_name)}, you're confirmed for <strong>${escapeHtml(v.event_title)}</strong> with ${escapeHtml(v.partner)}. Here's everything you need — and you'll hear from us twice more before the build: site details one week out, and a final reminder 48 hours before.
    </p>
    ${detailsCard(v, date, time)}
    ${
      v.what_to_bring
        ? `<div style="margin:24px 0;"><div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7A746C;margin-bottom:8px;">What to bring</div><p style="font-size:15px;line-height:1.7;color:#374151;margin:0;">${escapeHtml(v.what_to_bring)}</p></div>`
        : ""
    }
    <p style="font-size:16px;line-height:1.7;color:#374151;">
      Plans change — if you can't make it, just reply to this email so we can offer your spot to the waitlist. See you on site.
    </p>
  `;
  return {
    subject: waitlisted
      ? `Waitlisted — ${v.event_title} · ${date}`
      : `You're confirmed — ${v.event_title} · ${date}`,
    html: wrap(inner, waitlisted ? "Waitlisted" : "Build Day Confirmed"),
    text: waitlisted
      ? `${v.event_title} on ${date} is at capacity — you're on the waitlist. If a spot opens we'll email you at least 72 hours before the build.`
      : `You're confirmed for ${v.event_title} on ${date}, ${time}.
Location: ${v.location ?? "Details sent one week before the build"}
${v.what_to_bring ? `What to bring: ${v.what_to_bring}\n` : ""}
We'll send site details one week out and a reminder 48 hours before. If you can't make it, reply to this email.

— 8th Street Construction × ${v.partner}`,
  };
}

const detailsCard = (v: VolunteerEmailPayload, date: string, time: string) => `
  <div style="background:#FBF9F5;border:1px solid #EBE3D2;padding:20px;border-radius:6px;margin:24px 0;">
    <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7A746C;margin-bottom:12px;">Build day details</div>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:6px 0;font-size:13px;color:#7A746C;width:120px;">Build</td><td style="padding:6px 0;font-size:14px;">${escapeHtml(v.event_title)}</td></tr>
      <tr><td style="padding:6px 0;font-size:13px;color:#7A746C;">Partner</td><td style="padding:6px 0;font-size:14px;">${escapeHtml(v.partner)}</td></tr>
      <tr><td style="padding:6px 0;font-size:13px;color:#7A746C;">Date</td><td style="padding:6px 0;font-size:14px;">${date}</td></tr>
      <tr><td style="padding:6px 0;font-size:13px;color:#7A746C;">Time</td><td style="padding:6px 0;font-size:14px;">${time}</td></tr>
      <tr><td style="padding:6px 0;font-size:13px;color:#7A746C;">Location</td><td style="padding:6px 0;font-size:14px;">${escapeHtml(v.location ?? "Sent one week before the build")}</td></tr>
      <tr><td style="padding:6px 0;font-size:13px;color:#7A746C;">Group</td><td style="padding:6px 0;font-size:14px;">${v.group_size} ${v.group_size === 1 ? "volunteer" : "volunteers"}</td></tr>
    </table>
  </div>
`;

const wrap = (inner: string, title: string) => `
<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#F5F1EA;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#0A0F14;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
    <div style="border-left:3px solid #B86F3E;padding-left:16px;margin-bottom:32px;">
      <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7A746C;">8th Street Construction · Volunteer Program</div>
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
