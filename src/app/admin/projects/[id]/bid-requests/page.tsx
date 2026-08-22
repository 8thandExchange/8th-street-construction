import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createBidRequest, awardBid, closeBidRequest } from "@/lib/actions/bids";
import { ManualSubQuoteForm } from "@/components/costs/ManualSubQuoteForm";
import { BidLeveling } from "@/components/costs/BidLeveling";
import { SubmitButton } from "@/components/admin/SubmitButton";

const RFQ_STATUS_BADGES: Record<string, string> = {
  open: "app-badge-blue",
  awarded: "app-badge-green",
  closed: "app-badge-neutral",
};

const BID_STATUS_BADGES: Record<string, string> = {
  submitted: "app-badge-blue",
  shortlisted: "app-badge-amber",
  awarded: "app-badge-green",
  declined: "app-badge-red",
};

export const dynamic = "force-dynamic";

export default async function ProjectBidRequestsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id, title").eq("id", id).single();
  if (!project) notFound();

  const [{ data: rfqs }, { data: subs }, { data: estimateLines }, { data: scopeTemplates }] = await Promise.all([
    supabase
      .from("bid_requests")
      .select(
        "id, title, trade, scope_of_work, bid_deadline, status, created_at, bids(id, amount, status, submitted_at, document_id, subcontractors(id, company_name, trade))"
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
    supabase.from("scope_templates").select("id, trade, title").order("trade").order("title"),
  ]);

  return (
    <div className="max-w-4xl">
      <h2 className="app-h1 !text-[18px] mb-2">Sub quotes</h2>
      <p className="text-sm app-muted mb-6 max-w-2xl leading-relaxed">
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
        className="app-card p-6 space-y-4 mb-10"
      >
        <input type="hidden" name="project_id" value={id} />
        <h3 className="app-label">Ask subs to bid (optional)</h3>
        <p className="text-xs app-muted mb-4">
          Only if you want subs to log into the portal. Otherwise use the form above.
        </p>
        <div>
          <label className="field-label">Title *</label>
          <input name="title" required className="field-input" placeholder="Scope of work" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Trade *</label>
            <input name="trade" required className="field-input" placeholder="trade" />
          </div>
          <div>
            <label className="field-label">Bid deadline</label>
            <input type="datetime-local" name="bid_deadline" className="field-input" />
          </div>
        </div>
        {(scopeTemplates ?? []).length > 0 && (
          <div>
            <label className="field-label">Start from the scope library</label>
            <select name="scope_template_id" className="field-input" defaultValue="">
              <option value="">— none —</option>
              {(scopeTemplates ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.trade} — {t.title}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs app-muted">
              The template&apos;s full text is appended to the scope below, so the standard is what
              subs price. Edit the library at Settings → Scope library.
            </p>
          </div>
        )}
        <div>
          <label className="field-label">Scope of work</label>
          <textarea
            name="scope_of_work"
            rows={4}
            className="field-input"
            placeholder="Job-specific notes — the chosen library scope is appended automatically"
          />
        </div>
        <div>
          <label className="field-label mb-2 block">Invite subcontractors *</label>
          <div className="max-h-48 overflow-y-auto border border-ink/15 p-3 space-y-2">
            {(subs ?? []).length === 0 ? (
              <p className="text-sm app-muted italic">
                No subs in directory — add them at Admin → Subcontractors.
              </p>
            ) : (
              subs!.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" name="subcontractor_ids" value={s.id} className="accent-copper" />
                  <span>
                    {s.company_name}{" "}
                    <span className="text-xs app-muted">{s.trade}</span>
                    {s.preferred && (
                      <span className="app-badge app-badge-accent ml-1">Preferred</span>
                    )}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
        <SubmitButton>Send RFQ</SubmitButton>
      </form>

      <div className="space-y-8">
        {(rfqs ?? []).map((rfq) => (
          <section key={rfq.id} className="app-card p-6">
            <div className="flex flex-wrap justify-between gap-3 mb-4">
              <div>
                <h3 className="app-h2 !text-[16px]">{rfq.title}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs app-muted">
                  <span>{rfq.trade}</span>
                  <span className={`app-badge ${RFQ_STATUS_BADGES[rfq.status] ?? "app-badge-neutral"}`}>
                    {rfq.status}
                  </span>
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
                  <button
                    type="submit"
                    className="text-[13px] font-medium text-copper hover:underline"
                  >
                    Close RFQ
                  </button>
                </form>
              )}
            </div>
            <p className="text-sm text-ink/70 whitespace-pre-wrap mb-6">{rfq.scope_of_work}</p>
            <table className="app-table">
              <thead>
                <tr className="text-left app-label border-b border-ink/10">
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
                      <div className="text-xs app-muted">{sub?.trade}</div>
                    </td>
                    <td className="py-3 font-mono">
                      {b.amount != null ? `$${Number(b.amount).toLocaleString()}` : "—"}
                      {b.document_id && (
                        <a
                          href={`/api/documents/${b.document_id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block font-sans text-xs font-medium text-copper hover:underline"
                        >
                          Open document
                        </a>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={`app-badge ${BID_STATUS_BADGES[b.status] ?? "app-badge-neutral"}`}>
                        {b.status}
                      </span>
                    </td>
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
                            className="text-[13px] font-medium text-copper hover:underline"
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
            <BidLeveling
              bidRequestId={rfq.id}
              bidCount={
                (Array.isArray(rfq.bids) ? rfq.bids : []).filter((b) => b.amount != null).length
              }
            />
          </section>
        ))}
        {!rfqs?.length && (
          <p className="app-card p-10 text-center text-sm italic app-muted">
            No bid requests yet.
          </p>
        )}
      </div>
    </div>
  );
}
