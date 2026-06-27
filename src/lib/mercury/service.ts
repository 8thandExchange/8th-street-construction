import { createAdminClient } from "@/lib/supabase/admin";
import { mercuryConfigured } from "./config";
import { createMercuryCustomer } from "./customers";
import { createMercuryInvoice, mercuryPayUrl } from "./invoices";
import type { MercuryInvoice } from "./types";

export type MercuryLineItem = {
  description: string;
  quantity: number;
  unit_amount: number;
};

type SyncInvoiceInput = {
  invoiceId: string;
  invoiceNumber: string;
  title: string;
  amount: number;
  dueDate: string | null;
  lineItems: MercuryLineItem[];
  projectId: string;
  projectTitle: string;
  clientId: string | null;
  clientEmail: string | null;
  clientName: string | null;
  payerMemo?: string;
};

async function getOrCreateMercuryCustomer(
  admin: ReturnType<typeof createAdminClient>,
  clientId: string,
  email: string,
  name: string
) {
  const { data: existing } = await admin
    .from("mercury_customers")
    .select("mercury_customer_id")
    .eq("profile_id", clientId)
    .maybeSingle();

  if (existing?.mercury_customer_id) {
    return existing.mercury_customer_id;
  }

  const customer = await createMercuryCustomer({ name, email });
  await admin.from("mercury_customers").insert({
    profile_id: clientId,
    mercury_customer_id: customer.id,
    email,
    name,
  });

  return customer.id;
}

export async function pushInvoiceToMercury(
  input: SyncInvoiceInput
): Promise<MercuryInvoice | null> {
  if (!mercuryConfigured()) return null;
  if (!input.clientId || !input.clientEmail) return null;

  const admin = createAdminClient();
  const customerId = await getOrCreateMercuryCustomer(
    admin,
    input.clientId,
    input.clientEmail,
    input.clientName || input.clientEmail
  );

  const today = new Date().toISOString().slice(0, 10);
  const dueDate =
    input.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)
      ? input.dueDate
      : new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

  const mercury = await createMercuryInvoice({
    customerId,
    invoiceNumber: input.invoiceNumber,
    invoiceDate: today,
    dueDate,
    lineItems: input.lineItems.map((li) => ({
      name: li.description,
      unitPrice: li.unit_amount,
      quantity: li.quantity,
    })),
    payerMemo: input.payerMemo ?? `Payment for ${input.projectTitle}`,
    internalNote: `Platform invoice ${input.invoiceId} · project ${input.projectId}`,
    sendEmailOption: "DontSend",
    creditCardEnabled: true,
    achDebitEnabled: true,
  });

  await admin
    .from("invoices")
    .update({
      mercury_invoice_id: mercury.id,
      mercury_pay_slug: mercury.slug,
      mercury_status: mercury.status,
    })
    .eq("id", input.invoiceId);

  return mercury;
}

export function getMercuryPayLink(slug: string | null | undefined) {
  return slug ? mercuryPayUrl(slug) : null;
}
