import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchMercuryInvoicePdf } from "@/lib/mercury/invoices";
import { mercuryConfigured } from "@/lib/mercury/config";

export const dynamic = "force-dynamic";

async function userCanAccessInvoice(invoiceId: string, userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", userId).single();
  if (profile?.role === "admin") return true;

  const { data: invoice } = await admin
    .from("invoices")
    .select("client_id, project_id")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return false;
  if (invoice.client_id === userId) return true;

  const { data: project } = await admin
    .from("projects")
    .select("client_id")
    .eq("id", invoice.project_id)
    .single();

  return project?.client_id === userId;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!mercuryConfigured()) {
    return NextResponse.json({ error: "Mercury not configured" }, { status: 503 });
  }

  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await userCanAccessInvoice(id, user.id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: invoice } = await admin
    .from("invoices")
    .select("invoice_number, mercury_pay_slug")
    .eq("id", id)
    .single();

  if (!invoice?.mercury_pay_slug) {
    return NextResponse.json({ error: "PDF not available" }, { status: 404 });
  }

  try {
    const pdf = await fetchMercuryInvoicePdf(invoice.mercury_pay_slug);
    const filename = `${invoice.invoice_number || "invoice"}.pdf`;
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch PDF from Mercury" }, { status: 502 });
  }
}
