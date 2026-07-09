import { Resend } from "resend";

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set — emails will be skipped");
    return null;
  }
  return new Resend(key);
}

const FROM = process.env.EMAIL_FROM || "8th Street Construction <onboarding@resend.dev>";

export type PurchaseOrderEmailPayload = {
  to: string;
  firstName: string;
  companyName: string;
  poNumber: string;
  title: string;
  totalFormatted: string;
  neededBy: string | null;
  projectTitle: string;
  projectAddress: string | null;
  description: string | null;
  notes: string | null;
  lines: { description: string; quantity: number; amountFormatted: string }[];
};

/** Plain, printable PO email to the subcontractor — the PO itself, inline. */
export async function sendPurchaseOrderEmail(payload: PurchaseOrderEmailPayload) {
  const resend = client();
  if (!resend) return { skipped: true };

  const neededBy = payload.neededBy
    ? new Date(`${payload.neededBy}T12:00:00`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const lineRows = payload.lines
    .map(
      (li) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;">${li.description}${
          li.quantity !== 1 ? ` × ${li.quantity}` : ""
        }</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">${li.amountFormatted}</td></tr>`
    )
    .join("");

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a18;max-width:560px;margin:0 auto;">
    <p style="letter-spacing:2px;font-size:11px;color:#b5451b;text-transform:uppercase;">8th Street Construction</p>
    <h1 style="font-size:20px;color:#101c2a;margin:4px 0 16px;">Purchase Order ${payload.poNumber}</h1>
    <p>Hi ${payload.firstName},</p>
    <p>8th Street Construction is issuing purchase order <strong>${payload.poNumber}</strong> to ${payload.companyName} for <strong>${payload.projectTitle}</strong>${
      payload.projectAddress ? ` (${payload.projectAddress})` : ""
    }.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      <tr><th style="text-align:left;padding:8px 12px;border-bottom:2px solid #101c2a;">${payload.title}</th><th style="text-align:right;padding:8px 12px;border-bottom:2px solid #101c2a;">Amount</th></tr>
      ${lineRows}
      <tr><td style="padding:10px 12px;font-weight:bold;">Total</td><td style="padding:10px 12px;text-align:right;font-weight:bold;">${payload.totalFormatted}</td></tr>
    </table>
    ${payload.description ? `<p style="font-size:14px;color:#444;"><strong>Scope:</strong> ${payload.description}</p>` : ""}
    ${neededBy ? `<p style="font-size:14px;"><strong>Needed by:</strong> ${neededBy}</p>` : ""}
    ${payload.notes ? `<p style="font-size:14px;color:#444;"><strong>Notes:</strong> ${payload.notes}</p>` : ""}
    <p style="font-size:14px;">Reply to this email to confirm or with any questions.</p>
    <p style="font-size:13px;color:#6b645a;">— The 8th Street team<br/>A division of 8th and Exchange Capital</p>
  </div>`;

  const text = [
    `Purchase Order ${payload.poNumber} — 8th Street Construction`,
    ``,
    `To: ${payload.companyName}`,
    `Project: ${payload.projectTitle}${payload.projectAddress ? ` (${payload.projectAddress})` : ""}`,
    `Work: ${payload.title}`,
    ...payload.lines.map(
      (li) => `- ${li.description}${li.quantity !== 1 ? ` × ${li.quantity}` : ""}: ${li.amountFormatted}`
    ),
    `Total: ${payload.totalFormatted}`,
    neededBy ? `Needed by: ${neededBy}` : "",
    payload.notes ? `Notes: ${payload.notes}` : "",
    ``,
    `Reply to this email to confirm.`,
  ]
    .filter(Boolean)
    .join("\n");

  return resend.emails.send({
    from: FROM,
    to: payload.to,
    subject: `Purchase Order ${payload.poNumber} — ${payload.projectTitle}`,
    html,
    text,
  });
}
