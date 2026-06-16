import { EMAIL_BRAND, EMAIL_FONT } from "../brand";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.8thstreetconstruction.com";

const { parchment, ink, rust, pencil, border } = EMAIL_BRAND;

export function accessRequestNotificationEmail(payload: {
  email: string;
  firstName: string | null;
  lastName: string | null;
  requestedRole: string;
  message: string | null;
}) {
  const name = [payload.firstName, payload.lastName].filter(Boolean).join(" ") || payload.email;
  const subject = `Portal access request — ${name}`;

  const html = `
<!doctype html>
<html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:${parchment};font-family:${EMAIL_FONT.sans};color:${ink};">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
    <div style="border-left:3px solid ${rust};padding-left:16px;margin-bottom:32px;">
      <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${pencil};">8th Street Construction</div>
      <h1 style="font-family:${EMAIL_FONT.display};font-size:24px;margin:8px 0 0;font-weight:500;">Portal access request</h1>
    </div>
    <ul style="font-size:15px;line-height:1.8;padding-left:20px;margin:0 0 24px;">
      <li><strong>Name:</strong> ${name}</li>
      <li><strong>Email:</strong> <a href="mailto:${payload.email}" style="color:${rust};text-decoration:none;">${payload.email}</a></li>
      <li><strong>Requested role:</strong> ${payload.requestedRole}</li>
      ${payload.message ? `<li><strong>Message:</strong> ${payload.message}</li>` : ""}
    </ul>
    <p style="margin:0;"><a href="${SITE}/admin/users" style="color:${rust};font-weight:500;">Review in Portal Users →</a></p>
    <div style="margin-top:48px;padding-top:24px;border-top:1px solid ${border};font-size:12px;color:${pencil};text-align:center;">
      8th Street Construction · Augusta, Georgia
    </div>
  </div>
</body></html>`;

  const text = [
    `Portal access request from ${name} (${payload.email})`,
    `Role: ${payload.requestedRole}`,
    payload.message ? `Message: ${payload.message}` : "",
    `Review: ${SITE}/admin/users`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
