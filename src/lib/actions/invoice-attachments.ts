"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ATTACHMENT_BUCKET } from "@/lib/assistant/attachments";
import { INVOICE_BACKUP_PREFIX } from "@/lib/billing/backup-attachments";

export async function deleteInvoiceAttachment(formData: FormData) {
  const { supabase } = await requireAdmin();
  const projectId = String(formData.get("project_id"));
  const invoiceId = String(formData.get("invoice_id"));
  const attachmentId = String(formData.get("attachment_id"));

  const { data: attachment } = await supabase
    .from("invoice_attachments")
    .select("id, storage_path, invoice:invoices(project_id)")
    .eq("id", attachmentId)
    .eq("invoice_id", invoiceId)
    .single();
  if (!attachment) throw new Error("Attachment not found.");

  const { error } = await supabase
    .from("invoice_attachments")
    .delete()
    .eq("id", attachmentId);
  if (error) throw new Error(error.message);

  // Best-effort file cleanup — the DB row is the source of truth.
  if (attachment.storage_path?.startsWith(INVOICE_BACKUP_PREFIX)) {
    const admin = createAdminClient();
    await admin.storage.from(ATTACHMENT_BUCKET).remove([attachment.storage_path]);
  }

  revalidatePath(`/admin/projects/${projectId}/billing/invoices/${invoiceId}`);
  revalidatePath(`/admin/projects/${projectId}/billing`);
}
