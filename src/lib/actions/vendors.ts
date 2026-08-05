"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ATTACHMENT_BUCKET, STAGING_PREFIX } from "@/lib/assistant/attachments";

function revalidateVendors(vendorId?: string) {
  revalidatePath("/admin/vendors");
  if (vendorId) revalidatePath(`/admin/vendors/${vendorId}`);
}

/** Move a staged chat/form upload (assistant-inbox/…) into a permanent folder. */
async function moveStagedFile(stagedPath: string, destFolder: string): Promise<string | null> {
  if (!stagedPath.startsWith(STAGING_PREFIX) || stagedPath.includes("..")) return null;
  const admin = createAdminClient();
  const ext = stagedPath.split(".").pop() || "bin";
  const finalPath = `${destFolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await admin.storage.from(ATTACHMENT_BUCKET).move(stagedPath, finalPath);
  if (error) {
    console.error("Vendor file move failed:", error.message);
    return null;
  }
  return finalPath;
}

export async function createVendor(formData: FormData) {
  const { user } = await requireAdmin();
  void user;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Vendor name is required" };

  const admin = createAdminClient();
  const stagedLogo = String(formData.get("logo_staged_path") ?? "").trim();
  const logoPath = stagedLogo ? await moveStagedFile(stagedLogo, "vendors/logos") : null;

  const { data: vendor, error } = await admin
    .from("vendors")
    .upsert(
      {
        name,
        contact_email: String(formData.get("contact_email") ?? "").trim() || null,
        phone: String(formData.get("phone") ?? "").trim() || null,
        notes: String(formData.get("notes") ?? "").trim() || null,
        ...(logoPath ? { logo_path: logoPath } : {}),
      },
      { onConflict: "name", ignoreDuplicates: false }
    )
    .select("id, name")
    .single();

  if (error || !vendor) {
    // Unique index is on lower(name); fall back to updating the existing row.
    const { data: existing } = await admin
      .from("vendors")
      .select("id")
      .ilike("name", name)
      .maybeSingle();
    if (!existing) return { error: error?.message ?? "Could not save vendor" };
    await admin
      .from("vendors")
      .update({
        contact_email: String(formData.get("contact_email") ?? "").trim() || null,
        phone: String(formData.get("phone") ?? "").trim() || null,
        notes: String(formData.get("notes") ?? "").trim() || null,
        ...(logoPath ? { logo_path: logoPath } : {}),
      })
      .eq("id", existing.id);
    revalidateVendors(existing.id);
    return { ok: true, vendor_id: existing.id };
  }

  revalidateVendors(vendor.id);
  return { ok: true, vendor_id: vendor.id };
}

export async function updateVendorLogo(formData: FormData) {
  await requireAdmin();
  const vendorId = String(formData.get("vendor_id") ?? "");
  const stagedLogo = String(formData.get("logo_staged_path") ?? "").trim();
  if (!vendorId || !stagedLogo) return { error: "Vendor and logo file are required" };

  const logoPath = await moveStagedFile(stagedLogo, "vendors/logos");
  if (!logoPath) return { error: "Could not store the logo — try uploading again" };

  const admin = createAdminClient();
  const { error } = await admin.from("vendors").update({ logo_path: logoPath }).eq("id", vendorId);
  if (error) return { error: error.message };
  revalidateVendors(vendorId);
  return { ok: true };
}

export async function recordVendorBill(formData: FormData) {
  const { user } = await requireAdmin();
  const vendorId = String(formData.get("vendor_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const amount = Number(formData.get("amount"));
  if (!vendorId || !title) return { error: "Vendor and description are required" };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter a valid amount" };

  const admin = createAdminClient();
  const stagedFile = String(formData.get("file_staged_path") ?? "").trim();
  const filePath = stagedFile ? await moveStagedFile(stagedFile, `vendors/${vendorId}/bills`) : null;

  const projectId = String(formData.get("project_id") ?? "").trim() || null;
  const { data: bill, error } = await admin
    .from("vendor_bills")
    .insert({
      vendor_id: vendorId,
      project_id: projectId,
      bill_number: String(formData.get("bill_number") ?? "").trim() || null,
      title,
      amount: Math.round(amount * 100) / 100,
      // Seed a single line so the stored lines always reconcile with the
      // total — the printed invoice can never show lines that don't add up.
      line_items: [{ description: title, amount: Math.round(amount * 100) / 100 }],
      issued_date: String(formData.get("issued_date") ?? "").trim() || null,
      due_date: String(formData.get("due_date") ?? "").trim() || null,
      file_path: filePath,
      notes: String(formData.get("notes") ?? "").trim() || null,
      created_by: user.id,
    })
    .select("id, title, amount")
    .single();

  if (error || !bill) return { error: error?.message ?? "Could not record the bill" };
  revalidateVendors(vendorId);
  return { ok: true, bill_id: bill.id };
}

type BillLine = { description: string; amount: number };

function parseBillLines(raw: string): BillLine[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((l) => ({
        description: String(l?.description ?? "").trim(),
        amount: Math.round(Number(l?.amount) * 100) / 100,
      }))
      .filter((l) => l.description && Number.isFinite(l.amount) && l.amount > 0)
      .slice(0, 30);
  } catch {
    return [];
  }
}

/** Edit a bill — line items drive the total when present. */
export async function updateVendorBill(formData: FormData) {
  await requireAdmin();
  const billId = String(formData.get("bill_id") ?? "");
  const vendorId = String(formData.get("vendor_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!billId || !title) return { error: "Bill and description are required" };

  const lines = parseBillLines(String(formData.get("line_items") ?? "[]"));
  const lineTotal = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
  const amount = lines.length ? lineTotal : Number(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter a valid amount" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("vendor_bills")
    .update({
      title,
      bill_number: String(formData.get("bill_number") ?? "").trim() || null,
      amount,
      line_items: lines,
      project_id: String(formData.get("project_id") ?? "").trim() || null,
      issued_date: String(formData.get("issued_date") ?? "").trim() || null,
      due_date: String(formData.get("due_date") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .eq("id", billId);
  if (error) return { error: error.message };

  revalidateVendors(vendorId);
  revalidatePath(`/admin/vendors/${vendorId}/bills/${billId}`);
  return { ok: true, amount };
}

/** Save the vendor's remit (ACH) details — stored in the database only. */
export async function updateVendorRemit(formData: FormData) {
  await requireAdmin();
  const vendorId = String(formData.get("vendor_id") ?? "");
  if (!vendorId) return { error: "Vendor is required" };

  const accountNumber = String(formData.get("remit_account_number") ?? "").replace(/\D/g, "");
  const routingNumber = String(formData.get("remit_routing_number") ?? "").replace(/\D/g, "");
  if (routingNumber && routingNumber.length !== 9) {
    return { error: "Routing numbers are 9 digits" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("vendors")
    .update({
      address: String(formData.get("address") ?? "").trim() || null,
      remit_account_name: String(formData.get("remit_account_name") ?? "").trim() || null,
      remit_account_number: accountNumber || null,
      remit_routing_number: routingNumber || null,
      remit_account_type:
        String(formData.get("remit_account_type") ?? "").trim() || "businessChecking",
      // New banking details invalidate any previously created Mercury recipient
      mercury_recipient_id: null,
    })
    .eq("id", vendorId);
  if (error) return { error: error.message };

  revalidateVendors(vendorId);
  return { ok: true };
}

/** Pay an open bill by ACH through Mercury. Idempotent per bill. */
export async function payVendorBillAch(formData: FormData) {
  await requireAdmin();
  const billId = String(formData.get("bill_id") ?? "");
  const vendorId = String(formData.get("vendor_id") ?? "");

  const admin = createAdminClient();
  const { data: bill } = await admin
    .from("vendor_bills")
    .select("id, title, bill_number, amount, status, mercury_transaction_id, vendor:vendors(*)")
    .eq("id", billId)
    .eq("vendor_id", vendorId)
    .single();
  if (!bill) return { error: "Bill not found" };
  if (bill.status === "paid") return { error: "This bill is already marked paid." };
  if (bill.mercury_transaction_id) {
    return { error: "A payment for this bill was already initiated." };
  }

  const vendor = Array.isArray(bill.vendor) ? bill.vendor[0] : bill.vendor;
  if (!vendor) return { error: "Vendor not found" };

  try {
    const { ensureVendorRecipient, sendVendorAch } = await import("@/lib/mercury/payouts");
    const recipientId = await ensureVendorRecipient(vendor);
    const txn = await sendVendorAch({
      recipientId,
      amount: Number(bill.amount),
      note: `${bill.bill_number ?? bill.title} — 8th Street Construction`,
      idempotencyKey: bill.id,
    });

    await admin
      .from("vendor_bills")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        mercury_transaction_id: txn.id,
      })
      .eq("id", billId);

    revalidateVendors(vendorId);
    revalidatePath(`/admin/vendors/${vendorId}/bills/${billId}`);
    return { ok: true, transaction_id: txn.id, transaction_status: txn.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Mercury payment failed";
    return { error: message };
  }
}

export async function setVendorBillStatus(formData: FormData) {
  await requireAdmin();
  const billId = String(formData.get("bill_id") ?? "");
  const vendorId = String(formData.get("vendor_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["open", "paid", "void"].includes(status)) return { error: "Invalid status" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("vendor_bills")
    .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null })
    .eq("id", billId);
  if (error) return { error: error.message };
  revalidateVendors(vendorId);
  return { ok: true };
}

export async function deleteVendorBill(formData: FormData) {
  await requireAdmin();
  const billId = String(formData.get("bill_id") ?? "");
  const vendorId = String(formData.get("vendor_id") ?? "");
  const admin = createAdminClient();
  const { data: bill } = await admin
    .from("vendor_bills")
    .select("file_path")
    .eq("id", billId)
    .single();
  if (bill?.file_path) {
    await admin.storage.from(ATTACHMENT_BUCKET).remove([bill.file_path]);
  }
  await admin.from("vendor_bills").delete().eq("id", billId);
  revalidateVendors(vendorId);
  return { ok: true };
}
