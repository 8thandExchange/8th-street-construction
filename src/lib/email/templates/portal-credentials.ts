import { EMAIL_BRAND, EMAIL_FONT } from "../brand";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.8thstreetconstruction.com";

const { parchment, ink, rust, pencil, border, paper } = EMAIL_BRAND;

export function portalCredentialsEmail(payload: {
  firstName: string;
  email: string;
  tempPassword: string;
  role: string;
  loginPath: string;
}) {
  const loginUrl = `${SITE}${payload.loginPath}`;
  const roleLabel =
    payload.role === "admin"
      ? "Admin"
      : payload.role === "subcontractor"
        ? "Subcontractor"
        : "Client";

  const subject = `Your ${roleLabel} portal access — 8th Street Construction`;

  const html = `
<!doctype html>
<html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:${parchment};font-family:${EMAIL_FONT.sans};color:${ink};">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
    <div style="border-left:3px solid ${rust};padding-left:16px;margin-bottom:32px;">
      <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${pencil};">8th Street Construction</div>
    </div>
    <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">Hi ${payload.firstName},</p>
    <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">Your <strong>${roleLabel} Portal</strong> account is ready. Sign in with the credentials below, then set a new password on first login.</p>
    <table cellpadding="8" style="border-collapse:collapse;margin:16px 0;width:100%;background:${paper};border:1px solid ${border};border-radius:4px;">
      <tr><td style="color:${pencil};font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Email</td><td style="font-size:15px;">${payload.email}</td></tr>
      <tr><td style="color:${pencil};font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Temporary password</td><td style="font-size:15px;"><code>${payload.tempPassword}</code></td></tr>
    </table>
    <p style="margin:24px 0;"><a href="${loginUrl}" style="color:${rust};font-weight:500;">Sign in to your portal →</a></p>
    <p style="color:${pencil};font-size:13px;line-height:1.6;">For security, you'll be asked to choose a new password immediately after signing in.</p>
    <div style="margin-top:48px;padding-top:24px;border-top:1px solid ${border};font-size:12px;color:${pencil};text-align:center;">
      8th Street Construction · Augusta, Georgia
    </div>
  </div>
</body></html>`;

  const text = [
    `Hi ${payload.firstName},`,
    `Your ${roleLabel} Portal account is ready.`,
    `Email: ${payload.email}`,
    `Temporary password: ${payload.tempPassword}`,
    `Sign in: ${loginUrl}`,
    "You'll be asked to set a new password on first login.",
  ].join("\n");

  return { subject, html, text };
}
