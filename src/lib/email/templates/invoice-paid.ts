import { EMAIL_BRAND, EMAIL_FONT } from "../brand";
import { emailAmountBlock, emailButton, emailLayout, escapeHtml } from "../layout";

const { ink, inkMuted, pencil } = EMAIL_BRAND;

export type InvoicePaidEmailPayload = {
  firstName: string;
  projectTitle: string;
  invoiceNumber: string;
  invoiceTitle: string;
  amountFormatted: string;
  portalUrl: string;
};

export function invoicePaidEmail(payload: InvoicePaidEmailPayload) {
  const greeting = payload.firstName ? `Hi ${escapeHtml(payload.firstName)},` : "Hello,";

  const body = `
    <p style="font-family:${EMAIL_FONT.sans};font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${pencil};margin:0 0 12px;">Payment received</p>
    <h1 style="font-family:${EMAIL_FONT.display};font-size:30px;font-weight:500;line-height:1.2;margin:0 0 12px;color:${ink};">
      Thank you — we received your payment
    </h1>
    <p style="font-family:${EMAIL_FONT.sans};font-size:15px;line-height:1.7;color:${inkMuted};margin:0 0 20px;">
      ${greeting} Your payment for <strong style="color:${ink};">${escapeHtml(payload.projectTitle)}</strong> has been recorded.
    </p>
    <p style="font-family:${EMAIL_FONT.sans};font-size:13px;color:${pencil};margin:0 0 20px;">
      Invoice <strong>${escapeHtml(payload.invoiceNumber)}</strong> · ${escapeHtml(payload.invoiceTitle)}
    </p>
    ${emailAmountBlock(payload.amountFormatted, "Amount paid")}
    ${emailButton(payload.portalUrl, "View billing history")}
  `;

  const text = `Payment received for invoice ${payload.invoiceNumber} (${payload.amountFormatted}). View: ${payload.portalUrl}`;

  return {
    subject: `Payment received — ${payload.invoiceNumber}`,
    html: emailLayout({
      title: "Payment received",
      preheader: `Thank you — ${payload.amountFormatted} received for ${payload.projectTitle}`,
      body,
    }),
    text,
  };
}
