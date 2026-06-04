import { Resend } from "resend";

function resend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM = process.env.EMAIL_FROM || "8th Street Construction <hello@8thstreetconstruction.com>";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.8thstreetconstruction.com";

export async function sendProjectUpdateEmail(payload: {
  to: string;
  firstName: string;
  projectTitle: string;
  updateTitle: string;
  projectId: string;
}) {
  const client = resend();
  if (!client) return { skipped: true };

  const url = `${SITE}/client/projects/${payload.projectId}`;
  return client.emails.send({
    from: FROM,
    to: payload.to,
    subject: `New progress update — ${payload.projectTitle}`,
    html: `
      <p>Hi ${payload.firstName},</p>
      <p>Your project <strong>${payload.projectTitle}</strong> has a new update: <strong>${payload.updateTitle}</strong>.</p>
      <p><a href="${url}">View in your client portal →</a></p>
      <p>— 8th Street Construction</p>
    `,
    text: `New update on ${payload.projectTitle}: ${payload.updateTitle}. View: ${url}`,
  });
}

export async function sendChangeOrderEmail(payload: {
  to: string;
  firstName: string;
  projectTitle: string;
  coNumber: number;
  coTitle: string;
  projectId: string;
}) {
  const client = resend();
  if (!client) return { skipped: true };
  const url = `${SITE}/client/projects/${payload.projectId}/change-orders`;
  return client.emails.send({
    from: FROM,
    to: payload.to,
    subject: `Change order #${payload.coNumber} ready for review`,
    html: `
      <p>Hi ${payload.firstName},</p>
      <p>Please review change order <strong>#${payload.coNumber}: ${payload.coTitle}</strong> for <strong>${payload.projectTitle}</strong>.</p>
      <p><a href="${url}">Review and respond →</a></p>
    `,
    text: `Change order #${payload.coNumber} ready for review: ${url}`,
  });
}

export async function sendNewMessageEmail(payload: {
  to: string;
  projectTitle: string;
  projectId: string;
  isClient: boolean;
}) {
  const client = resend();
  if (!client) return { skipped: true };
  const url = payload.isClient
    ? `${SITE}/admin/projects/${payload.projectId}/messages`
    : `${SITE}/client/projects/${payload.projectId}/messages`;
  return client.emails.send({
    from: FROM,
    to: payload.to,
    subject: `New message — ${payload.projectTitle}`,
    html: `<p>You have a new message on <strong>${payload.projectTitle}</strong>.</p><p><a href="${url}">Open conversation →</a></p>`,
    text: `New message on ${payload.projectTitle}: ${url}`,
  });
}
