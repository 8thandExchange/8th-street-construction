const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.8thstreetconstruction.com";

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
    <p>Someone requested portal access:</p>
    <ul>
      <li><strong>Name:</strong> ${name}</li>
      <li><strong>Email:</strong> ${payload.email}</li>
      <li><strong>Requested role:</strong> ${payload.requestedRole}</li>
      ${payload.message ? `<li><strong>Message:</strong> ${payload.message}</li>` : ""}
    </ul>
    <p><a href="${SITE}/admin/users">Review in Portal Users →</a></p>
  `;

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
