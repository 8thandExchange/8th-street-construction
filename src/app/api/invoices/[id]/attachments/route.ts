import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ATTACHMENT_BUCKET } from "@/lib/assistant/attachments";
import {
  ALLOWED_BACKUP_TYPES,
  INVOICE_BACKUP_PREFIX,
  MAX_BACKUP_BYTES,
} from "@/lib/billing/backup-attachments";

export const dynamic = "force-dynamic";

/**
 * Attach a backup invoice (vendor/sub PDF or photo) to an invoice.
 * multipart form: file, optional line_item_id.
 */
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id: invoiceId } = await props.params;

  let supabase;
  let userId: string;
  try {
    const auth = await requireAdmin();
    supabase = auth.supabase;
    userId = auth.user.id;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, project_id")
    .eq("id", invoiceId)
    .single();
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  let file: File | null = null;
  let lineItemId: string | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (entry instanceof File) file = entry;
    lineItemId = String(form.get("line_item_id") ?? "").trim() || null;
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_BACKUP_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PDF and image files (PNG, JPG) are supported." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BACKUP_BYTES) {
    return NextResponse.json(
      { error: `File is too large — the limit is ${Math.floor(MAX_BACKUP_BYTES / 1024 / 1024)}MB.` },
      { status: 400 }
    );
  }

  if (lineItemId) {
    const { data: lineItem } = await supabase
      .from("invoice_line_items")
      .select("id")
      .eq("id", lineItemId)
      .eq("invoice_id", invoiceId)
      .single();
    if (!lineItem) {
      return NextResponse.json({ error: "Line item not found on this invoice" }, { status: 400 });
    }
  }

  const ext =
    (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
  const path = `${INVOICE_BACKUP_PREFIX}${invoiceId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const { count } = await supabase
    .from("invoice_attachments")
    .select("id", { count: "exact", head: true })
    .eq("invoice_id", invoiceId);

  const { data: attachment, error } = await supabase
    .from("invoice_attachments")
    .insert({
      invoice_id: invoiceId,
      line_item_id: lineItemId,
      file_name: file.name,
      storage_path: path,
      media_type: file.type,
      file_size: file.size,
      display_order: count ?? 0,
      uploaded_by: userId,
    })
    .select("id, line_item_id, file_name, media_type, file_size")
    .single();

  if (error || !attachment) {
    await admin.storage.from(ATTACHMENT_BUCKET).remove([path]);
    return NextResponse.json(
      { error: error?.message ?? "Could not save attachment" },
      { status: 500 }
    );
  }

  return NextResponse.json({ attachment });
}
