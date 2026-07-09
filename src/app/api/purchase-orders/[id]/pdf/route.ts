import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderPurchaseOrderPdf } from "@/lib/billing/purchase-order-pdf";

export const dynamic = "force-dynamic";

/** Admin-only branded PO PDF; ?download=1 forces attachment. */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: po } = await supabase
    .from("purchase_orders")
    .select(
      "id, po_number, status, title, description, notes, issue_date, needed_by, total, project:projects(title, street_address, location), subcontractor:subcontractors(company_name, trade, profile:profiles(email))"
    )
    .eq("id", id)
    .single();
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: lines } = await supabase
    .from("purchase_order_lines")
    .select("description, quantity, unit_amount, amount, cost_division")
    .eq("purchase_order_id", id)
    .order("display_order");

  const project = Array.isArray(po.project) ? po.project[0] : po.project;
  const sub = Array.isArray(po.subcontractor) ? po.subcontractor[0] : po.subcontractor;
  const subProfile = sub ? (Array.isArray(sub.profile) ? sub.profile[0] : sub.profile) : null;

  const buffer = await renderPurchaseOrderPdf({
    poNumber: po.po_number,
    status: po.status,
    title: po.title,
    description: po.description,
    notes: po.notes,
    issueDate: po.issue_date,
    neededBy: po.needed_by,
    total: Number(po.total),
    projectTitle: project?.title ?? "Project",
    projectAddress:
      [project?.street_address, project?.location].filter(Boolean).join(", ") || null,
    subName: sub?.company_name ?? null,
    subTrade: sub?.trade ?? null,
    subEmail: subProfile?.email ?? null,
    lines: (lines ?? []).map((li) => ({
      description: li.description,
      quantity: Number(li.quantity),
      unit_amount: Number(li.unit_amount),
      amount: Number(li.amount),
      cost_division: li.cost_division,
    })),
  });

  const url = new URL(request.url);
  const disposition = url.searchParams.get("download") ? "attachment" : "inline";
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${po.po_number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
