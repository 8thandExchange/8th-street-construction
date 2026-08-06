import { getSiteUrl } from "@/lib/brand/assets";
import { EMAIL_BRAND } from "../brand";
import { emailButton, emailLayout, escapeHtml } from "../layout";
import {
  formatMeetingDate,
  minutesMarkdownToHtml,
  renderMinutesMarkdown,
  type MinutesBundle,
} from "@/lib/meetings/minutes-format";

const { ink, pencil, rust, paper, border } = EMAIL_BRAND;

/**
 * Circulated minutes. The body is the same canonical text stored on the
 * record, so the copy in someone's inbox and the copy in the system can't
 * drift apart.
 */
export function meetingMinutesEmail(bundle: MinutesBundle, options?: { note?: string }) {
  const { meeting } = bundle;
  const markdown = meeting.approved_snapshot || renderMinutesMarkdown(bundle);
  const site = getSiteUrl();

  const statusNote =
    meeting.status === "approved"
      ? "These minutes have been approved and are the record of the meeting."
      : "These are draft minutes — corrections welcome before they're confirmed at the next meeting.";

  const note = options?.note
    ? `<p style="font-size:16px;line-height:1.6;color:${ink};margin:0 0 20px;">${escapeHtml(options.note)}</p>`
    : "";

  const body = `
    ${note}
    <div style="padding:14px 18px;background:${paper};border-left:3px solid ${rust};margin:0 0 28px;">
      <div style="font-size:13px;line-height:1.5;color:${ink};">${escapeHtml(statusNote)}</div>
    </div>
    ${minutesMarkdownToHtml(markdown, { ink, pencil, rust, border })}
    ${emailButton(`${site}/admin/meetings/${meeting.id}`, "Open in the portal")}
  `;

  return {
    subject: `Minutes — ${meeting.title} — ${formatMeetingDate(meeting.meeting_date)}`,
    html: emailLayout({
      title: `Minutes — ${meeting.title}`,
      preheader: meeting.summary || formatMeetingDate(meeting.meeting_date),
      body,
    }),
    text: markdown,
  };
}
