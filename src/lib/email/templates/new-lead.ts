import { PROJECT_CATEGORY_LABELS } from "@/lib/utils";
import { EMAIL_BRAND, EMAIL_FONT } from "../brand";
import type { LeadEmailPayload } from "../resend";

const { parchment, ink, rust, pencil, border, borderLight, paper } = EMAIL_BRAND;

const wrap = (inner: string) => `
<!doctype html>
<html><head><meta charset="utf-8"><title>New Lead</title></head>
<body style="margin:0;padding:0;background:${parchment};font-family:${EMAIL_FONT.sans};color:${ink};">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="border-left:3px solid ${rust};padding-left:16px;margin-bottom:24px;">
      <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${pencil};">8th Street Construction</div>
      <h1 style="font-family:${EMAIL_FONT.display};font-size:28px;margin:8px 0 0;font-weight:500;">New Inquiry</h1>
    </div>
    ${inner}
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid ${border};font-size:12px;color:${pencil};">
      Sent from the 8th Street Construction website.
    </div>
  </div>
</body></html>`;

export function newLeadEmail(lead: LeadEmailPayload) {
  const projectType = lead.project_type
    ? PROJECT_CATEGORY_LABELS[lead.project_type] ?? lead.project_type
    : "Not specified";

  const rows = [
    ["Name", `${lead.first_name} ${lead.last_name}`],
    ["Email", `<a href="mailto:${lead.email}" style="color:${rust};text-decoration:none;">${lead.email}</a>`],
    ["Phone", lead.phone ? `<a href="tel:${lead.phone}" style="color:${rust};text-decoration:none;">${lead.phone}</a>` : "—"],
    ["Project Type", projectType],
    ["Received", new Date(lead.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })],
  ];

  const inner = `
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      ${rows.map(([k, v]) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${borderLight};font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:${pencil};width:120px;vertical-align:top;">${k}</td>
          <td style="padding:10px 0;border-bottom:1px solid ${borderLight};font-size:15px;">${v}</td>
        </tr>
      `).join("")}
    </table>
    <div>
      <div style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:${pencil};margin-bottom:8px;">Message</div>
      <div style="background:${paper};padding:16px;border-radius:4px;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(lead.message)}</div>
    </div>
  `;

  const text = `New inquiry from ${lead.first_name} ${lead.last_name}
Email: ${lead.email}
Phone: ${lead.phone || "—"}
Project Type: ${projectType}

${lead.message}`;

  return {
    subject: `New inquiry — ${lead.first_name} ${lead.last_name} — ${projectType}`,
    html: wrap(inner),
    text,
  };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
