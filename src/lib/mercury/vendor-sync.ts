import { createAdminClient } from "@/lib/supabase/admin";
import { mercuryFetch } from "./client";
import { mercuryConfigured } from "./config";

/**
 * Payables reconciliation — the mirror of sync.ts, which handles receivables.
 *
 * A vendor bill can be paid without the app's Pay-by-ACH button ever running:
 * someone sends the money from Mercury directly. Before this existed the app
 * recorded the webhook and did nothing with it, so the bill stayed `open` with
 * a null mercury_transaction_id — which is exactly the state that disarms the
 * double-pay guard in payVendorBillAch(). This closes that loop.
 */

export type MercuryTxn = {
  id: string;
  amount: number; // negative for money leaving the account
  status: string; // pending | sent | cancelled | failed | reversed
  postedAt?: string | null;
  externalMemo?: string | null;
  bankDescription?: string | null;
  note?: string | null;
  counterpartyName?: string | null;
};

/** Only these can claim a bill. A cancelled/failed send must never mark one paid. */
const LIVE_STATUSES = new Set(["sent", "pending"]);

function destinationAccountId() {
  return process.env.MERCURY_DESTINATION_ACCOUNT_ID?.trim() || null;
}

export async function getAccountTransaction(transactionId: string): Promise<MercuryTxn | null> {
  const accountId = destinationAccountId();
  if (!accountId) return null;
  try {
    return await mercuryFetch<MercuryTxn>(
      `/account/${accountId}/transaction/${transactionId}`
    );
  } catch (err) {
    console.error(`Mercury: could not fetch transaction ${transactionId}:`, err);
    return null;
  }
}

export async function listRecentAccountTransactions(limit = 200): Promise<MercuryTxn[]> {
  const accountId = destinationAccountId();
  if (!accountId) return [];
  try {
    const res = await mercuryFetch<{ transactions?: MercuryTxn[] }>(
      `/account/${accountId}/transactions?limit=${limit}&order=desc`
    );
    return res.transactions ?? [];
  } catch (err) {
    console.error("Mercury: could not list account transactions:", err);
    return [];
  }
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toCents(value: number) {
  return Math.round(Math.abs(value) * 100);
}

/** Every free-text field Mercury might carry the bill number or vendor name in. */
function haystack(txn: MercuryTxn) {
  return normalize(
    [txn.externalMemo, txn.bankDescription, txn.note, txn.counterpartyName]
      .filter(Boolean)
      .join(" ")
  );
}

export type OpenBill = {
  id: string;
  vendor_id: string;
  bill_number: string | null;
  amount: number | string;
  vendorName: string | null;
};

/**
 * Conservative on purpose: the amount must match to the cent AND the
 * transaction must independently name the bill or the vendor. Amount alone is
 * not enough — two vendors can be owed the same round number.
 */
export function transactionMatchesBill(txn: MercuryTxn, bill: OpenBill): boolean {
  if (!(txn.amount < 0)) return false;
  if (!LIVE_STATUSES.has(txn.status)) return false;
  if (toCents(txn.amount) !== toCents(Number(bill.amount))) return false;

  const hay = haystack(txn);
  const billNumber = bill.bill_number ? normalize(bill.bill_number) : "";
  if (billNumber.length >= 3 && hay.includes(billNumber)) return true;

  const vendorName = bill.vendorName ? normalize(bill.vendorName) : "";
  if (vendorName.length >= 6 && hay.includes(vendorName)) return true;

  return false;
}

async function revalidateVendorPaths(vendorId: string, billId: string) {
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/admin/vendors");
    revalidatePath(`/admin/vendors/${vendorId}`);
    revalidatePath(`/admin/vendors/${vendorId}/bills/${billId}`);
  } catch {
    // revalidatePath throws during a render pass — the page is already fresh
  }
}

/**
 * Match the given transactions against every unclaimed open bill.
 *
 * A `pending` transaction claims the bill (arming the double-pay guard) without
 * marking it paid; only a `sent` transaction flips the status.
 */
export async function reconcileVendorBillsFromTransactions(txns: MercuryTxn[]) {
  if (!txns.length) return { matched: 0, paid: 0, errors: 0 };

  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("vendor_bills")
    .select("id, vendor_id, bill_number, amount, status, vendor:vendors(name)")
    .eq("status", "open")
    .is("mercury_transaction_id", null);

  if (error) {
    console.error("Vendor bill reconcile: could not load open bills:", error.message);
    return { matched: 0, paid: 0, errors: 1 };
  }
  if (!rows?.length) return { matched: 0, paid: 0, errors: 0 };

  // A transaction already attached to a bill must never be reused for another.
  const { data: claimedRows } = await admin
    .from("vendor_bills")
    .select("mercury_transaction_id")
    .not("mercury_transaction_id", "is", null);
  const claimed = new Set((claimedRows ?? []).map((r) => r.mercury_transaction_id));

  let matched = 0;
  let paid = 0;
  let errors = 0;

  for (const row of rows) {
    const vendor = Array.isArray(row.vendor) ? row.vendor[0] : row.vendor;
    const bill: OpenBill = {
      id: row.id,
      vendor_id: row.vendor_id,
      bill_number: row.bill_number,
      amount: row.amount,
      vendorName: vendor?.name ?? null,
    };

    const candidates = txns.filter(
      (t) => !claimed.has(t.id) && transactionMatchesBill(t, bill)
    );

    if (candidates.length === 0) continue;
    if (candidates.length > 1) {
      // Never guess with money. Leave it open for a human.
      console.warn(
        `Vendor bill reconcile: ${bill.bill_number ?? bill.id} matched ${candidates.length} transactions — skipping.`
      );
      continue;
    }

    const txn = candidates[0];
    const settled = txn.status === "sent";
    const patch: Record<string, unknown> = {
      mercury_transaction_id: txn.id,
      payment_initiated_at: txn.postedAt ?? new Date().toISOString(),
    };
    if (settled) {
      patch.status = "paid";
      patch.paid_at = txn.postedAt ?? new Date().toISOString();
    }

    // .is(...) makes this a no-op if another run claimed the bill first.
    const { data: updated, error: updateError } = await admin
      .from("vendor_bills")
      .update(patch)
      .eq("id", bill.id)
      .is("mercury_transaction_id", null)
      .select("id");

    if (updateError) {
      console.error(
        `Vendor bill reconcile: failed to update ${bill.bill_number ?? bill.id}:`,
        updateError.message
      );
      errors += 1;
      continue;
    }
    if (!updated?.length) continue;

    claimed.add(txn.id);
    matched += 1;
    if (settled) paid += 1;
    console.log(
      `Vendor bill reconcile: ${bill.bill_number ?? bill.id} -> ${txn.id} (${txn.status})`
    );
    await revalidateVendorPaths(bill.vendor_id, bill.id);
  }

  return { matched, paid, errors };
}

/**
 * Webhook entry point. Reconciles against the one transaction the event names,
 * falling back to a sweep when the event carries no usable id.
 */
export async function syncVendorBillsForTransaction(transactionId?: string | null) {
  if (!mercuryConfigured()) return { matched: 0, paid: 0, errors: 0 };

  if (transactionId) {
    const txn = await getAccountTransaction(transactionId);
    if (txn) return reconcileVendorBillsFromTransactions([txn]);
  }
  return syncOpenVendorBills();
}

/** Sweep: match every open bill against recent account activity. */
export async function syncOpenVendorBills() {
  if (!mercuryConfigured()) return { matched: 0, paid: 0, errors: 0 };

  const admin = createAdminClient();
  const { count } = await admin
    .from("vendor_bills")
    .select("id", { count: "exact", head: true })
    .eq("status", "open")
    .is("mercury_transaction_id", null);

  if (!count) return { matched: 0, paid: 0, errors: 0 };

  const txns = await listRecentAccountTransactions();
  return reconcileVendorBillsFromTransactions(txns);
}
