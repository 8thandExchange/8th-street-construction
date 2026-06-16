import { EMAIL_BRAND, EMAIL_FONT } from "../brand";
import type { LeadEmailPayload } from "../resend";

const { parchment, ink, inkMuted, rust, pencil, border } = EMAIL_BRAND;

export function leadConfirmationEmail(lead: LeadEmailPayload) {
  const html = `
<!doctype html>
<html><head><meta charset="utf-8"><title>We received your inquiry</title></head>
<body style="margin:0;padding:0;background:${parchment};font-family:${EMAIL_FONT.display};color:${ink};">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-family:${EMAIL_FONT.sans};font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${pencil};">8th Street Construction</div>
      <div style="font-family:${EMAIL_FONT.sans};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${rust};margin-top:4px;">Augusta, Georgia</div>
    </div>
    <h1 style="font-size:32px;font-weight:400;letter-spacing:-0.02em;line-height:1.15;margin:0 0 16px;">Thank you, ${escapeHtml(lead.first_name)}.</h1>
    <p style="font-family:${EMAIL_FONT.sans};font-size:16px;line-height:1.7;color:${inkMuted};margin:0 0 16px;">
      We received your inquiry and a member of our team will be in touch within one business day. We read every message carefully — no auto-replies pretending otherwise.
    </p>
    <p style="font-family:${EMAIL_FONT.sans};font-size:16px;line-height:1.7;color:${inkMuted};margin:0 0 24px;">
      In the meantime, if there's anything urgent, you can reply directly to this email.
    </p>
    <div style="border-left:2px solid ${rust};padding-left:16px;margin-top:32px;font-family:${EMAIL_FONT.sans};font-size:14px;color:${pencil};line-height:1.6;">
      <div style="font-style:italic;color:${inkMuted};">"We don't chase volume. We build right."</div>
      <div style="margin-top:8px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;">— The 8th Street Team</div>
    </div>
    <div style="margin-top:48px;padding-top:24px;border-top:1px solid ${border};font-family:${EMAIL_FONT.sans};font-size:12px;color:${pencil};text-align:center;">
      8th Street Construction · Augusta, Georgia<br/>
      A division of 8th and Exchange Capital
    </div>
  </div>
</body></html>`;

  const text = `Thank you, ${lead.first_name}.

We received your inquiry and a member of our team will be in touch within one business day.

If there's anything urgent, reply directly to this email.

— The 8th Street Construction Team
A division of 8th and Exchange Capital`;

  return {
    subject: "We received your inquiry — 8th Street Construction",
    html,
    text,
  };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
