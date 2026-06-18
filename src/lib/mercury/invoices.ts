import { MERCURY_API_BASE, MERCURY_PAY_BASE } from "./config";
import { mercuryFetch } from "./client";
import type { CreateMercuryInvoiceInput, MercuryInvoice } from "./types";

export function mercuryPayUrl(slug: string) {
  return `${MERCURY_PAY_BASE}/${slug}`;
}

export async function createMercuryInvoice(
  input: CreateMercuryInvoiceInput
): Promise<MercuryInvoice> {
  const destinationAccountId = process.env.MERCURY_DESTINATION_ACCOUNT_ID?.trim();
  if (!destinationAccountId) throw new Error("MERCURY_DESTINATION_ACCOUNT_ID is not set");

  return mercuryFetch<MercuryInvoice>("/ar/invoices", {
    method: "POST",
    json: {
      customerId: input.customerId,
      invoiceNumber: input.invoiceNumber,
      invoiceDate: input.invoiceDate,
      dueDate: input.dueDate,
      lineItems: input.lineItems,
      destinationAccountId,
      payerMemo: input.payerMemo ?? null,
      internalNote: input.internalNote ?? null,
      sendEmailOption: input.sendEmailOption ?? "DontSend",
      creditCardEnabled: input.creditCardEnabled ?? true,
      achDebitEnabled: input.achDebitEnabled ?? true,
      useRealAccountNumber: false,
      ccEmails: input.ccEmails ?? [],
    },
  });
}

export async function getMercuryInvoice(invoiceId: string): Promise<MercuryInvoice> {
  return mercuryFetch<MercuryInvoice>(`/ar/invoices/${invoiceId}`);
}

export async function fetchMercuryInvoicePdf(slug: string): Promise<ArrayBuffer> {
  const token = process.env.MERCURY_API_TOKEN?.trim();
  if (!token) throw new Error("Mercury is not configured");

  const fixieUrl = process.env.FIXIE_URL?.trim();
  const url = `${MERCURY_API_BASE}/ar/invoices/${slug}/pdf`;
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/pdf" };

  if (fixieUrl) {
    const { ProxyAgent, fetch: undiciFetch } = await import("undici");
    const res = await undiciFetch(url, { headers, dispatcher: new ProxyAgent(fixieUrl) });
    if (!res.ok) throw new Error(`Mercury PDF failed (${res.status})`);
    return res.arrayBuffer();
  }

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Mercury PDF failed (${res.status})`);
  return res.arrayBuffer();
}
