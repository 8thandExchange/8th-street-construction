import { mercuryFetch } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Outbound ACH to a vendor (accounts payable) — the mirror of the
 * receivables flow. Uses the same Mercury token + Fixie static-IP proxy.
 */

export type VendorRemit = {
  id: string;
  name: string;
  contact_email: string | null;
  address: string | null;
  remit_account_name: string | null;
  remit_account_number: string | null;
  remit_routing_number: string | null;
  remit_account_type: string | null;
  mercury_recipient_id: string | null;
};

type MercuryRecipient = { id: string };
type MercuryTransaction = { id: string; status: string };

export function vendorRemitComplete(v: VendorRemit): boolean {
  return Boolean(v.remit_account_number?.trim() && v.remit_routing_number?.trim());
}

/** Find or create the Mercury recipient for this vendor; persists the id. */
export async function ensureVendorRecipient(vendor: VendorRemit): Promise<string> {
  if (vendor.mercury_recipient_id) return vendor.mercury_recipient_id;
  if (!vendorRemitComplete(vendor)) {
    throw new Error("Add the vendor's account and routing numbers before paying by ACH.");
  }

  const recipient = await mercuryFetch<MercuryRecipient>("/recipients", {
    method: "POST",
    json: {
      name: vendor.remit_account_name?.trim() || vendor.name,
      emails: vendor.contact_email ? [vendor.contact_email] : [],
      defaultPaymentMethod: "electronic",
      electronicRoutingInfo: {
        accountNumber: vendor.remit_account_number!.trim(),
        routingNumber: vendor.remit_routing_number!.trim(),
        electronicAccountType: vendor.remit_account_type?.trim() || "businessChecking",
      },
    },
  });

  const admin = createAdminClient();
  const { error } = await admin
    .from("vendors")
    .update({ mercury_recipient_id: recipient.id })
    .eq("id", vendor.id);

  // Not fatal — the recipient exists at Mercury and the payment can proceed.
  // But losing the id means the next payout creates a duplicate recipient, so
  // this must never fail silently the way it used to.
  if (error) {
    console.error(
      `Mercury: created recipient ${recipient.id} for vendor ${vendor.id} but could not persist the id:`,
      error.message
    );
  }

  return recipient.id;
}

/** Send the ACH. idempotencyKey = bill id, so a double-click can't double-pay. */
export async function sendVendorAch(input: {
  recipientId: string;
  amount: number;
  note: string;
  idempotencyKey: string;
}): Promise<MercuryTransaction> {
  const accountId = process.env.MERCURY_DESTINATION_ACCOUNT_ID?.trim();
  if (!accountId) throw new Error("Mercury account is not configured.");

  return mercuryFetch<MercuryTransaction>(`/account/${accountId}/transactions`, {
    method: "POST",
    json: {
      recipientId: input.recipientId,
      amount: Math.round(input.amount * 100) / 100,
      paymentMethod: "ach",
      note: input.note.slice(0, 90),
      idempotencyKey: input.idempotencyKey,
    },
  });
}
