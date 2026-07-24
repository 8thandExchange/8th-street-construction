import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ATTACHMENT_BUCKET } from "@/lib/assistant/attachments";
import { renderInvoiceCoverPdf } from "@/lib/billing/invoice-cover-pdf";

export const dynamic = "force-dynamic";

/**
 * Full invoice packet: branded cover sheet + every backup invoice merged
 * behind it, exactly like the Habitat billing format. Admins and the
 * job's client can download it.
 */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id: invoiceId } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // RLS limits this read to admins and the invoice's client.
  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, title, status, total, due_date, notes, sent_at, created_at, client_id, project:projects(id, title, street_address, location, client_id)"
    )
    .eq("id", invoiceId)
    .single();
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = Array.isArray(invoice.project) ? invoice.project[0] : invoice.project;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";
  const isOwningClient =
    invoice.client_id === user.id || project?.client_id === user.id;
  if (!isAdmin && !isOwningClient) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Drafts stay internal until sent.
  if (!isAdmin && (invoice.status === "draft" || invoice.status === "void")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const [{ data: lines }, { data: attachments }, clientRes] = await Promise.all([
    admin
      .from("invoice_line_items")
      .select(
        "id, description, quantity, amount, reference_number, city_budget_line:city_budget_lines(city_number)"
      )
      .eq("invoice_id", invoiceId)
      .order("display_order"),
    admin
      .from("invoice_attachments")
      .select("id, line_item_id, file_name, storage_path, media_type, display_order")
      .eq("invoice_id", invoiceId)
      .order("display_order"),
    project?.client_id
      ? admin
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", project.client_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const client = clientRes.data;
  const attachmentList = attachments ?? [];

  // Backups print in cover-sheet order: line-linked ones first, extras last.
  const lineOrder = new Map((lines ?? []).map((li, index) => [li.id, index]));
  const orderedAttachments = [...attachmentList].sort((a, b) => {
    const ai = a.line_item_id != null ? lineOrder.get(a.line_item_id) ?? 999 : 999;
    const bi = b.line_item_id != null ? lineOrder.get(b.line_item_id) ?? 999 : 999;
    return ai - bi || a.display_order - b.display_order;
  });

  const coverBuffer = await renderInvoiceCoverPdf({
    invoiceNumber: invoice.invoice_number,
    title: invoice.title,
    invoiceDate: invoice.sent_at ?? invoice.created_at,
    dueDate: invoice.due_date,
    projectTitle: project?.title ?? "Project",
    projectAddress:
      [project?.street_address, project?.location].filter(Boolean).join(", ") || null,
    billToName:
      [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
      client?.email ||
      null,
    billToEmail: client?.email ?? null,
    total: Number(invoice.total),
    notes: invoice.notes,
    lines: (lines ?? []).map((li) => {
      const budgetLine = Array.isArray(li.city_budget_line)
        ? li.city_budget_line[0]
        : li.city_budget_line;
      return {
        description: li.description,
        quantity: Number(li.quantity),
        amount: Number(li.amount),
        reference_number: li.reference_number,
        city_number: budgetLine?.city_number ?? null,
      };
    }),
    attachmentCount: orderedAttachments.length,
  });

  const packet = await PDFDocument.create();
  const cover = await PDFDocument.load(coverBuffer);
  for (const page of await packet.copyPages(cover, cover.getPageIndices())) {
    packet.addPage(page);
  }

  const skipped: string[] = [];
  for (const attachment of orderedAttachments) {
    const { data: file } = await admin.storage
      .from(ATTACHMENT_BUCKET)
      .download(attachment.storage_path);
    if (!file) {
      skipped.push(attachment.file_name);
      continue;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());

    try {
      if (attachment.media_type === "application/pdf") {
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        for (const page of await packet.copyPages(doc, doc.getPageIndices())) {
          packet.addPage(page);
        }
      } else {
        // Image backup (photo of a receipt/invoice) — one letter page, fitted.
        const image =
          attachment.media_type === "image/png"
            ? await packet.embedPng(bytes)
            : await packet.embedJpg(bytes);
        const page = packet.addPage([612, 792]);
        const margin = 36;
        const scale = Math.min(
          (612 - margin * 2) / image.width,
          (792 - margin * 2) / image.height,
          1
        );
        const w = image.width * scale;
        const h = image.height * scale;
        page.drawImage(image, {
          x: (612 - w) / 2,
          y: 792 - margin - h,
          width: w,
          height: h,
        });
      }
    } catch {
      skipped.push(attachment.file_name);
    }
  }

  if (skipped.length) {
    console.error(
      `Invoice packet ${invoice.invoice_number}: could not merge ${skipped.join(", ")}`
    );
  }

  const bytes = await packet.save();
  const url = new URL(request.url);
  const disposition = url.searchParams.get("download") ? "attachment" : "inline";
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="Invoice ${invoice.invoice_number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
