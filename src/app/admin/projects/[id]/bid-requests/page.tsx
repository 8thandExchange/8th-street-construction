import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createBidRequest, awardBid, closeBidRequest } from "@/lib/actions/bids";
import { ManualSubQuoteForm } from "@/components/costs/ManualSubQuoteForm";
import { formatMoney } from "@/lib/billing/constants";

export const dynamic = "force-dynamic";

export default async function ProjectBidRequestsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id, title").eq("id", id).single();
  if (!project) notFound();

  const [{ data: rfqs }, { data: subs }, { data: estimateLines }] = await Promise.all([
    supabase
      .from("bid_requests")
      .select(
        "id, title, trade, scope_of_work, bid_deadline, status, created_at, bids(id, amount, status, submitted_at, subcontractors(id, company_name, trade))"
      )
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("subcontractors")
      .select("id, company_name, trade, preferred, active")
      .eq("active", true)
      .order("company_name"),
    supabase
      .from("project_estimate_lines")
      .select("id, trade_label, division_code")
      .eq("project_id", id)
      .order("display_order"),
  ]);

  return (
    <div className="max-w-4xl">
      <h2 className="font-display text-2xl text-ink mb-2">Sub quotes</h2>
      <p className="text-sm text-ink/60 mb-6 max-w-2xl leading-relaxed">
        Quotes from subcontractors for {project.title}. Subs don&apos;t need to log in — enter quotes
        from email or scan the PDF. Compare against our cost plan on{" "}
        <Link href={`/admin/projects/${id}/costs`} className="text-copper hover:underline">
          Our Cost Plan
        </Link>
        .
      </p>

      <ManualSubQuoteForm
        projectId={id}
        estimateLines={estimateLines ?? []}
        subcontractors={subs ?? []}
      />

      <form
        action={async (fd) => {
          "use server";
          await createBidRequest(fd);
        }}
        className="p-6 border border-ink/15 bg-paper space-y-4 mb-10"
      >
        <input type="hidden" name="project_id" value={id} />
        <h3 className="eyebrow">Ask subs to bid (optional)</h3>
        <p className="text-xs text-ink/50 mb-4">
          Only if you want subs to log into the portal. Otherwise use the form above.
        </p>
        <div>
          <label className="field-label">Title *</label>
          <input name="title" required className="field-input" placeholder="Electrical rough-in" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Trade *</label>
            <input name="trade" required className="field-input" placeholder="electrical" />
          </div>
          <div>
            <label className="field-label">Bid deadline</label>
            <input type="datetime-local" name="bid_deadline" className="field-input" />
          </div>
        </div>
        <div>
          <label className="field-label">Scope of work *</label>
          <textarea name="scope_of_work" required rows={4} className="field-input" />
        </div>
        <div>
          <label className="field-label mb-2 block">Invite subcontractors *</label>
          <div className="max-h-48 overflow-y-auto border border-ink/15 p-3 space-y-2">
            {(subs ?? []).length === 0 ? (
              <p className="text-sm text-ink/50 italic">
                No subs in directory — add them at Admin → Subcontractors.
              </p>
            ) : (
              subs!.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" name="subcontractor_ids" value={s.id} className="accent-copper" />
                  <span>
                    {s.company_name}{" "}
                    <span className="text-stone-300 font-mono text-xs">{s.trade}</span>
                    {s.preferred && (
                      <span className="text-copper text-[10px] ml-1 uppercase">Preferred</span>
                    )}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
        <button type="submit" className="h-10 px-5 bg-ink text-bone font-mono text-[10px] uppercase">
          Send RFQ
        </button>
      </form>

      <div className="space-y-8">
        {(rfqs ?? []).map((rfq) => (
          <section key={rfq.id} className="border border-ink/15 bg-paper p-6">
            <div className="flex flex-wrap justify-between gap-3 mb-4">
              <div>
                <h3 className="font-display text-xl text-ink">{rfq.title}</h3>
                <div className="text-xs font-mono text-stone-300 mt-1 uppercase">
                  {rfq.trade} · {rfq.status}
                </div>
              </div>
              {rfq.status === "open" && (
                <form
                  action={async (fd) => {
                    "use server";
                    await closeBidRequest(fd);
                  }}
                >
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="bid_request_id" value={rfq.id} />
                  <button type="submit" className="text-[10px] font-mono uppercase text-stone-300">
                    Close RFQ
                  </button>
                </form>
              )}
            </div>
            <p className="text-sm text-ink/70 whitespace-pre-wrap mb-6">{rfq.scope_of_work}</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-mono uppercase text-stone-300 border-b border-ink/10">
                  <th className="pb-2">Subcontractor</th>
                  <th className="pb-2">Bid</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(rfq.bids) ? rfq.bids : []).map((b) => {
                  const sub = Array.isArray(b.subcontractors)
                    ? b.subcontractors[0]
                    : b.subcontractors;
                  return (
                  <tr key={b.id} className="border-b border-ink/5">
                    <td className="py-3">
                      {sub?.company_name ?? "—"}
                      <div className="text-xs text-stone-300">{sub?.trade}</div>
                    </td>
                    <td className="py-3 font-mono">
                      {b.amount != null ? `$${Number(b.amount).toLocaleString()}` : "—"}
                    </td>
                    <td className="py-3 text-xs uppercase font-mono">{b.status}</td>
                    <td className="py-3 text-right">
                      {rfq.status === "open" && b.status === "submitted" && (
                        <form
                          action={async (fd) => {
                            "use server";
                            await awardBid(fd);
                          }}
                        >
                          <input type="hidden" name="project_id" value={id} />
                          <input type="hidden" name="bid_id" value={b.id} />
                          <input type="hidden" name="bid_request_id" value={rfq.id} />
                          <button
                            type="submit"
                            className="text-[10px] font-mono uppercase text-copper hover:underline"
                          >
                            Award
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}
        {!rfqs?.length && (
          <p className="text-ink/50 italic text-center py-8 border border-dashed border-ink/20">
            No bid requests yet.
          </p>
        )}
      </div>
    </div>
  );
}
