const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.8thstreetconstruction.com";

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
    <p>Hi ${payload.firstName},</p>
    <p>Your <strong>${roleLabel} Portal</strong> account is ready. Sign in with the credentials below, then set a new password on first login.</p>
    <table cellpadding="8" style="border-collapse:collapse;margin:16px 0;">
      <tr><td><strong>Email</strong></td><td>${payload.email}</td></tr>
      <tr><td><strong>Temporary password</strong></td><td><code>${payload.tempPassword}</code></td></tr>
    </table>
    <p><a href="${loginUrl}">Sign in to your portal →</a></p>
    <p style="color:#666;font-size:13px;">For security, you'll be asked to choose a new password immediately after signing in.</p>
    <p>— 8th Street Construction</p>
  `;

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
