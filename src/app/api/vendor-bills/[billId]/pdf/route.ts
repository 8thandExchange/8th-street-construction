import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderVendorBillPdf, type PdfImageSrc } from "@/lib/billing/vendor-bill-pdf";
import { publicVendorLogo } from "@/lib/vendors/logos";
import { getSiteUrl } from "@/lib/brand/assets";
import { ATTACHMENT_BUCKET } from "@/lib/assistant/attachments";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  props: { params: Promise<{ billId: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { billId } = await props.params;
  const admin = createAdminClient();
  const { data: bill } = await admin
    .from("vendor_bills")
    .select("*, vendor:vendors(*), project:projects(title, street_address)")
    .eq("id", billId)
    .single();
  if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });

  const vendor = Array.isArray(bill.vendor) ? bill.vendor[0] : bill.vendor;
  const project = Array.isArray(bill.project) ? bill.project[0] : bill.project;
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const lines: { description: string; amount: number }[] = Array.isArray(bill.line_items)
    ? bill.line_items
        .filter(
          (l: unknown): l is { description: string; amount: number } =>
            typeof (l as { description?: unknown }).description === "string" &&
            Number.isFinite(Number((l as { amount?: unknown }).amount))
        )
        .map((l: { description: string; amount: number }) => ({
          description: l.description,
          amount: Number(l.amount),
        }))
    : [];
  if (!lines.length) lines.push({ description: bill.title, amount: Number(bill.amount) });

  // An uploaded logo (vendors.logo_path) always wins over the repo-hosted
  // crest. The bucket is private, so download the bytes rather than handing
  // the renderer a signed URL that could expire mid-render.
  let logo: PdfImageSrc | null = null;
  if (vendor.logo_path) {
    const { data: file } = await admin.storage
      .from(ATTACHMENT_BUCKET)
      .download(vendor.logo_path);
    if (file) {
      const ext = vendor.logo_path.split(".").pop()?.toLowerCase();
      logo = {
        data: Buffer.from(await file.arrayBuffer()),
        format: ext === "jpg" || ext === "jpeg" ? "jpg" : "png",
      };
    }
  }
  if (!logo) {
    const fallbackLogo = publicVendorLogo(vendor.name);
    if (fallbackLogo) logo = `${getSiteUrl()}${fallbackLogo}`;
  }

  const pdf = await renderVendorBillPdf({
    vendorName: vendor.name,
    vendorAddress: vendor.address ?? null,
    vendorEmail: vendor.contact_email ?? null,
    logo,
    billNumber: bill.bill_number,
    title: bill.title,
    issuedDate: bill.issued_date,
    dueDate: bill.due_date,
    projectLabel: project ? (project.street_address ?? project.title) : null,
    lines,
    total: Number(bill.amount),
    remit: {
      accountName: vendor.remit_account_name ?? null,
      accountNumber: vendor.remit_account_number ?? null,
      routingNumber: vendor.remit_routing_number ?? null,
      accountType: vendor.remit_account_type ?? null,
    },
    paid: bill.status === "paid",
  });

  const filename = `${vendor.name.replace(/[^a-zA-Z0-9]+/g, "-")}-${bill.bill_number ?? "invoice"}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
