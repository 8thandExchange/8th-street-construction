"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin-auth";
import { invoiceJobPrefix, formatMoney } from "@/lib/billing/constants";
import { sendPurchaseOrderEmail } from "@/lib/email/purchase-order-notify";

export type PurchaseOrderLineInput = {
  description: string;
  quantity: number;
  unit_amount: number;
  cost_division?: string | null;
};

function revalidatePo(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}/purchase-orders`);
  revalidatePath(`/admin/projects/${projectId}/costs`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/accounting");
}

function parseLines(raw: string): PurchaseOrderLineInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid line items.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Add at least one line item.");
  }
  return parsed.map((item, index) => {
    const description = String(item?.description ?? "").trim();
    const quantity = Number(item?.quantity);
    const unit_amount = Number(item?.unit_amount);
    if (!description) throw new Error(`Line ${index + 1} needs a description.`);
    if (!Number.isFinite(quantity) || quantity <= 0)
      throw new Error(`Line ${index + 1} needs a valid quantity.`);
    if (!Number.isFinite(unit_amount) || unit_amount <= 0)
      throw new Error(`Line ${index + 1} needs a valid amount.`);
    return {
      description,
      quantity,
      unit_amount,
      cost_division: String(item?.cost_division ?? "").trim() || null,
    };
  });
}

async function nextPoNumber(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  projectId: string
) {
  const [{ data: project }, { data: existing }] = await Promise.all([
    supabase.from("projects").select("slug").eq("id", projectId).single(),
    supabase.from("purchase_orders").select("po_number").eq("project_id", projectId),
  ]);
  const maxSeq = (existing ?? []).reduce((max, po) => {
    const match = String(po.po_number ?? "").match(/(\d+)\s*$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${invoiceJobPrefix(project?.slug)}-PO-${String(maxSeq + 1).padStart(3, "0")}`;
}

async function insertPurchaseOrder(args: {
  projectId: string;
  subcontractorId: string | null;
  bidId: string | null;
  title: string;
  description: string | null;
  neededBy: string | null;
  notes: string | null;
  lines: PurchaseOrderLineInput[];
}) {
  const { supabase, user } = await requireAdmin();
  const subtotal = args.lines.reduce(
    (sum, li) => sum + Math.round(li.quantity * li.unit_amount * 100) / 100,
    0
  );
  const poNumber = await nextPoNumber(supabase, args.projectId);

  const { data: po, error } = await supabase
    .from("purchase_orders")
    .insert({
      project_id: args.projectId,
      subcontractor_id: args.subcontractorId,
      bid_id: args.bidId,
      po_number: poNumber,
      title: args.title,
      description: args.description,
      needed_by: args.neededBy,
      subtotal,
      total: subtotal,
      notes: args.notes,
      created_by: user.id,
    })
    .select("id, po_number")
    .single();
  if (error || !po) throw new Error(error?.message ?? "Could not create purchase order");

  const { error: lineError } = await supabase.from("purchase_order_lines").insert(
    args.lines.map((li, index) => ({
      purchase_order_id: po.id,
      description: li.description,
      quantity: li.quantity,
      unit_amount: li.unit_amount,
      amount: Math.round(li.quantity * li.unit_amount * 100) / 100,
      cost_division: li.cost_division,
      display_order: index,
    }))
  );
  if (lineError) throw new Error(lineError.message);

  revalidatePo(args.projectId);
  return po;
}

export async function createPurchaseOrder(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required.");
  const lines = parseLines(String(formData.get("line_items") ?? "[]"));

  await insertPurchaseOrder({
    projectId,
    subcontractorId: String(formData.get("subcontractor_id") ?? "").trim() || null,
    bidId: null,
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    neededBy: String(formData.get("needed_by") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    lines,
  });
}

/** One click from an awarded bid: PO for the bid amount, tagged to the estimate division. */
export async function createPurchaseOrderFromBid(formData: FormData) {
  const { supabase } = await requireAdmin();
  const bidId = String(formData.get("bid_id"));
  const projectId = String(formData.get("project_id"));

  const { data: bid } = await supabase
    .from("bids")
    .select(
      "id, amount, notes, subcontractor_id, bid_request:bid_requests(id, title, trade, scope_of_work, project_id, estimate_line:project_estimate_lines!bid_requests_estimate_line_id_fkey(division_code, trade_label))"
    )
    .eq("id", bidId)
    .single();
  if (!bid) throw new Error("Bid not found.");

  const request = Array.isArray(bid.bid_request) ? bid.bid_request[0] : bid.bid_request;
  if (!request || request.project_id !== projectId) {
    throw new Error("Bid does not belong to this project.");
  }
  const estimateLine = Array.isArray(request.estimate_line)
    ? request.estimate_line[0]
    : request.estimate_line;

  const { count } = await supabase
    .from("purchase_orders")
    .select("id", { count: "exact", head: true })
    .eq("bid_id", bidId);
  if (count) throw new Error("This bid already has a purchase order.");

  await insertPurchaseOrder({
    projectId,
    subcontractorId: bid.subcontractor_id,
    bidId: bid.id,
    title: request.title,
    description: request.scope_of_work ?? null,
    neededBy: null,
    notes: bid.notes ?? null,
    lines: [
      {
        description: `${request.title}${request.trade ? ` (${request.trade})` : ""} — per awarded bid`,
        quantity: 1,
        unit_amount: Number(bid.amount),
        cost_division: estimateLine?.division_code ?? null,
      },
    ],
  });
}

/** Draft → issued. Optionally emails the PO to the sub's portal email. */
export async function issuePurchaseOrder(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const sendEmail = formData.get("send_email") === "on";

  const { data: po } = await supabase
    .from("purchase_orders")
    .select("id, status, po_number, title, total, needed_by, description, notes, subcontractor_id")
    .eq("id", id)
    .eq("project_id", projectId)
    .single();
  if (!po) throw new Error("Purchase order not found.");
  if (po.status !== "draft") throw new Error("Only draft purchase orders can be issued.");

  const { error } = await supabase
    .from("purchase_orders")
    .update({
      status: "issued",
      issue_date: new Date().toISOString().slice(0, 10),
      issued_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (sendEmail && po.subcontractor_id) {
    const [{ data: sub }, { data: project }, { data: lines }] = await Promise.all([
      supabase
        .from("subcontractors")
        .select("company_name, profile:profiles(email, first_name)")
        .eq("id", po.subcontractor_id)
        .single(),
      supabase.from("projects").select("title, street_address, location").eq("id", projectId).single(),
      supabase
        .from("purchase_order_lines")
        .select("description, quantity, unit_amount, amount")
        .eq("purchase_order_id", id)
        .order("display_order"),
    ]);
    const profile = sub ? (Array.isArray(sub.profile) ? sub.profile[0] : sub.profile) : null;
    if (profile?.email) {
      await sendPurchaseOrderEmail({
        to: profile.email,
        firstName: profile.first_name || sub?.company_name || "there",
        companyName: sub?.company_name ?? "your company",
        poNumber: po.po_number,
        title: po.title,
        totalFormatted: formatMoney(Number(po.total)),
        neededBy: po.needed_by,
        projectTitle: project?.title ?? "the project",
        projectAddress:
          [project?.street_address, project?.location].filter(Boolean).join(", ") || null,
        description: po.description,
        notes: po.notes,
        lines: (lines ?? []).map((li) => ({
          description: li.description,
          quantity: Number(li.quantity),
          amountFormatted: formatMoney(Number(li.amount)),
        })),
      });
    }
  }

  revalidatePo(projectId);
}

async function setPoStatus(
  formData: FormData,
  fromStatuses: string[],
  toStatus: string
) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));

  const { data: po } = await supabase
    .from("purchase_orders")
    .select("id, status")
    .eq("id", id)
    .eq("project_id", projectId)
    .single();
  if (!po) throw new Error("Purchase order not found.");
  if (!fromStatuses.includes(po.status)) {
    throw new Error(`Cannot move a ${po.status} purchase order to ${toStatus}.`);
  }

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: toStatus })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePo(projectId);
}

export async function markPurchaseOrderBilled(formData: FormData) {
  await setPoStatus(formData, ["issued"], "billed");
}

export async function closePurchaseOrder(formData: FormData) {
  await setPoStatus(formData, ["issued", "billed"], "closed");
}

export async function cancelPurchaseOrder(formData: FormData) {
  await setPoStatus(formData, ["draft", "issued"], "cancelled");
}

export async function deletePurchaseOrderDraft(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id"));
  const projectId = String(formData.get("project_id"));
  const { data: po } = await supabase
    .from("purchase_orders")
    .select("id, status")
    .eq("id", id)
    .eq("project_id", projectId)
    .single();
  if (!po) throw new Error("Purchase order not found.");
  if (po.status !== "draft") throw new Error("Only drafts can be deleted — cancel instead.");
  await supabase.from("purchase_orders").delete().eq("id", id);
  revalidatePo(projectId);
}
