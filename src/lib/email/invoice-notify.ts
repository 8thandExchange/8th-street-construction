import { Resend } from "resend";
import { getSiteUrl } from "@/lib/brand/assets";
import { invoicePaidEmail } from "./templates/invoice-paid";
import { invoiceReadyEmail } from "./templates/invoice-ready";

const FROM = process.env.EMAIL_FROM || "8th Street Construction <hello@8thstreetconstruction.com>";

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendInvoiceReadyEmail(payload: {
  to: string;
  firstName: string;
  projectTitle: string;
  projectId: string;
  invoiceNumber: string;
  invoiceTitle: string;
  amountFormatted: string;
  dueDateFormatted?: string | null;
  mercuryPayUrl?: string | null;
  isHabitat?: boolean;
}) {
  const resend = client();
  if (!resend) return { skipped: true };

  const portalUrl = `${getSiteUrl()}/client/projects/${payload.projectId}/billing`;
  const { subject, html, text } = invoiceReadyEmail({
    firstName: payload.firstName,
    projectTitle: payload.projectTitle,
    invoiceNumber: payload.invoiceNumber,
    invoiceTitle: payload.invoiceTitle,
    amountFormatted: payload.amountFormatted,
    dueDateFormatted: payload.dueDateFormatted,
    portalUrl,
    mercuryPayUrl: payload.mercuryPayUrl,
    isHabitat: payload.isHabitat,
  });

  return resend.emails.send({
    from: FROM,
    to: payload.to,
    subject,
    html,
    text,
  });
}

export async function sendInvoicePaidEmail(payload: {
  to: string;
  firstName: string;
  projectTitle: string;
  projectId: string;
  invoiceNumber: string;
  invoiceTitle: string;
  amountFormatted: string;
}) {
  const resend = client();
  if (!resend) return { skipped: true };

  const portalUrl = `${getSiteUrl()}/client/projects/${payload.projectId}/billing`;
  const { subject, html, text } = invoicePaidEmail({
    firstName: payload.firstName,
    projectTitle: payload.projectTitle,
    invoiceNumber: payload.invoiceNumber,
    invoiceTitle: payload.invoiceTitle,
    amountFormatted: payload.amountFormatted,
    portalUrl,
  });

  return resend.emails.send({
    from: FROM,
    to: payload.to,
    subject,
    html,
    text,
  });
}
