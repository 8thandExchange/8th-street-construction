import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

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

async function adminNotifyEmails() {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("email").eq("role", "admin");
  const emails = (data ?? []).map((p) => p.email).filter(Boolean) as string[];
  return emails.length ? emails : [process.env.EMAIL_TO_LEADS || "construction@8thandexchange.com"];
}

export async function sendPlanSignedAdminEmail(payload: {
  projectTitle: string;
  planTitle: string;
  version: number;
  signatureText: string;
  projectId: string;
}) {
  const client = resend();
  if (!client) return { skipped: true };

  const url = `${SITE}/admin/projects/${payload.projectId}/plans`;
  const to = await adminNotifyEmails();
  return client.emails.send({
    from: FROM,
    to,
    subject: `Client signed off on plans v${payload.version} — ${payload.projectTitle}`,
    html: `
      <p><strong>${payload.signatureText}</strong> signed off on plan set <strong>v${payload.version}: ${payload.planTitle}</strong> for <strong>${payload.projectTitle}</strong>.</p>
      <p>The sign-off record is stored in the portal.</p>
      <p><a href="${url}">View sign-off record →</a></p>
    `,
    text: `Client signed off on plans v${payload.version} for ${payload.projectTitle}: ${url}`,
  });
}

export async function sendPlanRevisionAdminEmail(payload: {
  projectTitle: string;
  planTitle: string;
  version: number;
  revisionNotes: string;
  projectId: string;
}) {
  const client = resend();
  if (!client) return { skipped: true };

  const url = `${SITE}/admin/projects/${payload.projectId}/plans`;
  const to = await adminNotifyEmails();
  return client.emails.send({
    from: FROM,
    to,
    subject: `Client requested plan revisions v${payload.version} — ${payload.projectTitle}`,
    html: `
      <p>The client requested revisions on plan set <strong>v${payload.version}: ${payload.planTitle}</strong> for <strong>${payload.projectTitle}</strong>.</p>
      <blockquote style="border-left:3px solid #ccc;margin:12px 0;padding-left:12px;color:#444">${payload.revisionNotes.replace(/\n/g, "<br>")}</blockquote>
      <p>Upload a revised plan set (new version) when ready.</p>
      <p><a href="${url}">Open plans →</a></p>
    `,
    text: `Plan revision requested for ${payload.projectTitle}: ${payload.revisionNotes}\n${url}`,
  });
}

export async function sendPlanSetEmail(payload: {
  to: string;
  firstName: string;
  projectTitle: string;
  planTitle: string;
  version: number;
  projectId: string;
}) {
  const client = resend();
  if (!client) return { skipped: true };
  const url = `${SITE}/client/projects/${payload.projectId}/plans`;
  return client.emails.send({
    from: FROM,
    to: payload.to,
    subject: `Plans v${payload.version} ready for sign-off — ${payload.projectTitle}`,
    html: `
      <p>Hi ${payload.firstName},</p>
      <p>Plan set <strong>v${payload.version}: ${payload.planTitle}</strong> for <strong>${payload.projectTitle}</strong> is ready for your review and sign-off.</p>
      <p>Local building regulations for your jurisdiction are included in the portal.</p>
      <p><a href="${url}">Review plans and sign off →</a></p>
    `,
    text: `Plans v${payload.version} ready for sign-off: ${url}`,
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
