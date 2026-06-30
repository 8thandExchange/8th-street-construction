import { EMAIL_BRAND, EMAIL_FONT } from "../brand";
import { emailAmountBlock, emailButton, emailLayout, emailSecondaryButton, escapeHtml } from "../layout";

const { ink, inkMuted, pencil } = EMAIL_BRAND;

export type InvoiceReadyEmailPayload = {
  firstName: string;
  projectTitle: string;
  invoiceNumber: string;
  invoiceTitle: string;
  amountFormatted: string;
  dueDateFormatted?: string | null;
  portalUrl: string;
  mercuryPayUrl?: string | null;
  isHabitat?: boolean;
};

export function invoiceReadyEmail(payload: InvoiceReadyEmailPayload) {
  const greeting = payload.firstName ? `Hi ${escapeHtml(payload.firstName)},` : "Hello,";
  const payNote = payload.mercuryPayUrl
    ? "Pay securely by bank transfer (ACH) using the button below."
    : payload.isHabitat
      ? "You can pay online through your client portal or arrange payment by check with your builder."
      : "You can pay online through your client portal.";

  const mercuryBtn = payload.mercuryPayUrl
    ? emailButton(payload.mercuryPayUrl, "Pay invoice securely")
    : "";

  const body = `
    <p style="font-family:${EMAIL_FONT.sans};font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${pencil};margin:0 0 12px;">Invoice ready</p>
    <h1 style="font-family:${EMAIL_FONT.display};font-size:30px;font-weight:500;line-height:1.2;margin:0 0 12px;color:${ink};">
      ${escapeHtml(payload.invoiceTitle)}
    </h1>
    <p style="font-family:${EMAIL_FONT.sans};font-size:15px;line-height:1.7;color:${inkMuted};margin:0 0 8px;">
      ${greeting} A new invoice is ready for <strong style="color:${ink};">${escapeHtml(payload.projectTitle)}</strong>.
    </p>
    <p style="font-family:${EMAIL_FONT.sans};font-size:13px;color:${pencil};margin:0 0 20px;">
      Invoice <strong>${escapeHtml(payload.invoiceNumber)}</strong>${payload.dueDateFormatted ? ` · Due ${escapeHtml(payload.dueDateFormatted)}` : ""}
    </p>
    ${emailAmountBlock(payload.amountFormatted, "Amount due")}
    <p style="font-family:${EMAIL_FONT.sans};font-size:15px;line-height:1.7;color:${inkMuted};margin:0;">${payNote}</p>
    ${mercuryBtn}
    ${emailSecondaryButton(payload.portalUrl, "Open billing in your client portal →")}
  `;

  const text = `Invoice ${payload.invoiceNumber} for ${payload.projectTitle}: ${payload.amountFormatted}${payload.dueDateFormatted ? ` (due ${payload.dueDateFormatted})` : ""}. ${payload.mercuryPayUrl ? `Pay: ${payload.mercuryPayUrl}` : ""} Portal: ${payload.portalUrl}`;

  return {
    subject: `Invoice ${payload.invoiceNumber} — ${payload.projectTitle}`,
    html: emailLayout({
      title: `Invoice ${payload.invoiceNumber}`,
      preheader: `${payload.amountFormatted} due for ${payload.projectTitle}`,
      body,
    }),
    text,
  };
}
