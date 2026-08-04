import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildInvoicePacket } from "@/lib/billing/invoice-packet";

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
    .select("id, status, client_id, project:projects(client_id)")
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
  const isOwningClient = invoice.client_id === user.id || project?.client_id === user.id;
  if (!isAdmin && !isOwningClient) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Drafts stay internal until sent.
  if (!isAdmin && (invoice.status === "draft" || invoice.status === "void")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const packet = await buildInvoicePacket(invoiceId);
  if (!packet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(request.url);
  const disposition = url.searchParams.get("download") ? "attachment" : "inline";
  return new Response(new Uint8Array(packet.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${packet.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
