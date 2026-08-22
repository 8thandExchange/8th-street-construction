import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import {
  acknowledgePurchaseOrder,
  cancelPurchaseOrder,
  closePurchaseOrder,
  createPurchaseOrderFromBid,
  deletePurchaseOrderDraft,
  issuePurchaseOrder,
  linkVendorBillToPurchaseOrder,
  markPurchaseOrderBilled,
} from "@/lib/actions/purchase-orders";
import { poBillCoverage } from "@/lib/procurement/po-from-bid";
import { loadApprovalThresholds } from "@/lib/finance/settings";
import { ThresholdConfirm } from "@/components/finance/ThresholdConfirm";
import { PurchaseOrderForm } from "@/components/costs/PurchaseOrderForm";
import { appStatusBadge } from "@/lib/project/status-badges";
import { formatMoney } from "@/lib/billing/constants";
import { SubmitButton } from "@/components/admin/SubmitButton";

export const dynamic = "force-dynamic";

const PO_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  issued: "Issued",
  billed: "Billed",
  closed: "Closed",
  cancelled: "Cancelled",
};

const fmt = (s: string | null) =>
  s
    ? new Date(`${s}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

export default async function PurchaseOrdersPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const [{ data: project }, { data: pos }, { data: subs }, { data: divisions }, { data: awardedBids }, { data: bills }, thresholds] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, title, estimated_cost")
        .eq("id", id)
        .single(),
      supabase
        .from("purchase_orders")
        .select(
          "id, po_number, title, status, total, issue_date, needed_by, created_at, acknowledged_at, acknowledged_note, subcontractor:subcontractors(company_name, trade)"
        )
        .eq("project_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("subcontractors")
        .select("id, company_name, trade")
        .eq("active", true)
        .order("company_name"),
      supabase
        .from("project_estimate_lines")
        .select("division_code, trade_label")
        .eq("project_id", id)
        .order("display_order"),
      supabase
        .from("bids")
        .select(
          "id, amount, subcontractor:subcontractors(company_name), bid_request:bid_requests!inner(title, project_id)"
        )
        .eq("status", "awarded")
        .eq("bid_requests.project_id", id),
      supabase
        .from("vendor_bills")
        .select("id, title, amount, status, purchase_order_id")
        .eq("project_id", id)
        .neq("status", "void"),
      loadApprovalThresholds(),
    ]);

  if (!project) notFound();

  const poList = pos ?? [];
  const committed = poList
    .filter((po) => ["issued", "billed", "closed"].includes(po.status))
    .reduce((sum, po) => sum + Number(po.total), 0);
  const billed = poList
    .filter((po) => ["billed", "closed"].includes(po.status))
    .reduce((sum, po) => sum + Number(po.total), 0);
  const draftCount = poList.filter((po) => po.status === "draft").length;
  const estimate = Number(project.estimated_cost ?? 0);

  const poBidIds = new Set(
    (
      await supabase
        .from("purchase_orders")
        .select("bid_id")
        .eq("project_id", id)
        .not("bid_id", "is", null)
    ).data?.map((r) => r.bid_id) ?? []
  );
  const bidsNeedingPo = (awardedBids ?? []).filter((b) => !poBidIds.has(b.id));

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <p className="app-label">Money</p>
        <h2 className="mt-2 app-h2">Purchase Orders</h2>
        <p className="mt-2 text-sm app-muted max-w-2xl">
          Commit costs to subs and vendors before the bills arrive. Issued POs count as committed
          cost against your plan; subs invoice against the PO number.
        </p>
      </div>

      {/* Committed-cost summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Committed", value: formatMoney(committed), sub: "Issued + billed POs" },
          { label: "Billed", value: formatMoney(billed), sub: "Invoiced by subs" },
          {
            label: "Cost plan",
            value: estimate ? formatMoney(estimate) : "Not set",
            sub: estimate
              ? `${Math.round((committed / estimate) * 100)}% committed`
              : "Set it on Our Cost Plan",
          },
          { label: "Drafts", value: String(draftCount), sub: "Not yet issued" },
        ].map((card) => (
          <div key={card.label} className="app-card p-4">
            <p className="app-label">{card.label}</p>
            <p className="mt-1 text-lg font-semibold text-navy app-num">{card.value}</p>
            <p className="mt-0.5 text-[11px] app-muted">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Awarded bids without a PO */}
      {bidsNeedingPo.length > 0 && (
        <div className="app-card p-6">
          <h3 className="app-h2 !text-[15px]">Awarded bids without a purchase order</h3>
          <ul className="mt-3 divide-y divide-navy/[0.06]">
            {bidsNeedingPo.map((bid) => {
              const sub = Array.isArray(bid.subcontractor) ? bid.subcontractor[0] : bid.subcontractor;
              const req = Array.isArray(bid.bid_request) ? bid.bid_request[0] : bid.bid_request;
              return (
                <li key={bid.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-navy">{req?.title}</p>
                    <p className="text-xs app-muted">
                      {sub?.company_name ?? "Unknown sub"} ·{" "}
                      <span className="app-num">{formatMoney(Number(bid.amount))}</span>
                    </p>
                  </div>
                  <form action={createPurchaseOrderFromBid}>
                    <input type="hidden" name="bid_id" value={bid.id} />
                    <input type="hidden" name="project_id" value={id} />
                    <SubmitButton className="app-btn app-btn-secondary !h-8 !text-[12.5px]">
                      Create PO from bid
                    </SubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <PurchaseOrderForm
        projectId={id}
        subcontractors={subs ?? []}
        divisions={divisions ?? []}
      />

      {/* PO list */}
      <div className="space-y-4">
        {poList.map((po) => {
          const sub = Array.isArray(po.subcontractor) ? po.subcontractor[0] : po.subcontractor;
          return (
            <div key={po.id} className="app-card p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs app-muted tabular-nums">{po.po_number}</span>
                <h3 className="app-h2 !text-[15px]">{po.title}</h3>
                <span className={appStatusBadge("purchase_order", po.status)}>
                  {PO_STATUS_LABELS[po.status] ?? po.status}
                </span>
                <span className="ml-auto text-sm font-semibold text-navy app-num">
                  {formatMoney(Number(po.total))}
                </span>
              </div>
              <p className="mt-1 text-xs app-muted">
                {sub?.company_name ? `${sub.company_name}${sub.trade ? ` · ${sub.trade}` : ""}` : "No sub linked"}
                {po.issue_date ? ` · Issued ${fmt(po.issue_date)}` : ""}
                {po.needed_by ? ` · Needed by ${fmt(po.needed_by)}` : ""}
                {po.acknowledged_at
                  ? ` · Acknowledged ${new Date(po.acknowledged_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}${po.acknowledged_note ? ` — ${po.acknowledged_note}` : ""}`
                  : ""}
              </p>
              {(() => {
                const linked = (bills ?? []).filter((bill) => bill.purchase_order_id === po.id);
                const coverage = poBillCoverage(
                  Number(po.total),
                  linked.map((bill) => Number(bill.amount))
                );
                const unlinked = (bills ?? []).filter((bill) => !bill.purchase_order_id);
                return (
                  <div className="mt-3 space-y-2 text-xs app-muted">
                    <p>
                      Bill coverage{" "}
                      <span className="app-num text-navy">
                        {formatMoney(coverage.billed)}
                      </span>{" "}
                      of {formatMoney(coverage.committed)}
                      {coverage.remaining > 0 ? ` · ${formatMoney(coverage.remaining)} open` : ""}
                      {coverage.over > 0 ? ` · ${formatMoney(coverage.over)} over` : ""}
                    </p>
                    {linked.length > 0 && (
                      <ul className="space-y-0.5">
                        {linked.map((bill) => (
                          <li key={bill.id}>
                            {bill.title} · {formatMoney(Number(bill.amount))}
                          </li>
                        ))}
                      </ul>
                    )}
                    {unlinked.length > 0 && po.status !== "cancelled" && po.status !== "draft" && (
                      <form action={linkVendorBillToPurchaseOrder} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="project_id" value={id} />
                        <input type="hidden" name="purchase_order_id" value={po.id} />
                        <select name="vendor_bill_id" required className="field-input !h-8 !w-auto !text-xs">
                          <option value="">Link a job bill…</option>
                          {unlinked.map((bill) => (
                            <option key={bill.id} value={bill.id}>
                              {bill.title} · {formatMoney(Number(bill.amount))}
                            </option>
                          ))}
                        </select>
                        <SubmitButton className="app-btn app-btn-ghost !h-8 !text-[12px]">
                          Link bill
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                );
              })()}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a
                  href={`/api/purchase-orders/${po.id}/pdf`}
                  target="_blank"
                  className="app-btn app-btn-secondary !h-8 !text-[12.5px]"
                >
                  PDF
                </a>
                {po.status === "draft" && (
                  <>
                    <form action={issuePurchaseOrder} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={po.id} />
                      <input type="hidden" name="project_id" value={id} />
                      <ThresholdConfirm
                        amount={Number(po.total)}
                        limit={thresholds.purchaseOrder}
                        noun="purchase order"
                      />
                      <label className="flex items-center gap-1.5 text-xs app-muted cursor-pointer">
                        <input type="checkbox" name="send_email" defaultChecked className="h-4 w-4 accent-copper" />
                        Email the sub
                      </label>
                      <SubmitButton className="app-btn app-btn-primary !h-8 !text-[12.5px]" pendingLabel="Issuing…">
                        Issue PO
                      </SubmitButton>
                    </form>
                    <form action={deletePurchaseOrderDraft}>
                      <input type="hidden" name="id" value={po.id} />
                      <input type="hidden" name="project_id" value={id} />
                      <SubmitButton className="app-btn app-btn-ghost !h-8 !text-[12.5px] hover:!text-red-600">
                        Delete draft
                      </SubmitButton>
                    </form>
                  </>
                )}
                {po.status !== "draft" && po.status !== "cancelled" && !po.acknowledged_at && (
                  <form action={acknowledgePurchaseOrder} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={po.id} />
                    <input type="hidden" name="project_id" value={id} />
                    <input
                      name="acknowledged_note"
                      placeholder="How they acknowledged (email, text)"
                      className="field-input !h-8 !w-52 !text-xs"
                    />
                    <SubmitButton className="app-btn app-btn-ghost !h-8 !text-[12.5px]">
                      Record acknowledgement
                    </SubmitButton>
                  </form>
                )}
                {po.status === "issued" && (
                  <form action={markPurchaseOrderBilled}>
                    <input type="hidden" name="id" value={po.id} />
                    <input type="hidden" name="project_id" value={id} />
                    <SubmitButton className="app-btn app-btn-secondary !h-8 !text-[12.5px]">
                      Mark billed
                    </SubmitButton>
                  </form>
                )}
                {(po.status === "issued" || po.status === "billed") && (
                  <>
                    <form action={closePurchaseOrder}>
                      <input type="hidden" name="id" value={po.id} />
                      <input type="hidden" name="project_id" value={id} />
                      <SubmitButton className="app-btn app-btn-secondary !h-8 !text-[12.5px]">
                        Close out
                      </SubmitButton>
                    </form>
                    {po.status === "issued" && (
                      <form action={cancelPurchaseOrder}>
                        <input type="hidden" name="id" value={po.id} />
                        <input type="hidden" name="project_id" value={id} />
                        <SubmitButton className="app-btn app-btn-ghost !h-8 !text-[12.5px] hover:!text-red-600">
                          Cancel
                        </SubmitButton>
                      </form>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!poList.length && (
        <div className="app-card p-12 text-center">
          <p className="app-muted text-sm">
            No purchase orders yet — create one above, or award a bid on Sub Quotes and turn it
            into a PO with one click.
          </p>
        </div>
      )}
    </div>
  );
}
