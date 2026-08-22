import Link from "next/link";
import { clientRespondProposal } from "@/lib/actions/proposals";
import { formatMoney } from "@/lib/billing/constants";
import { requireClientProjectFeature } from "@/lib/portal/access";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  sent: "Ready for review",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
};

export default async function ClientProposalsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const { supabase, project } = await requireClientProjectFeature(id, "proposals");
  const { data: proposals } = await supabase
    .from("project_proposals")
    .select(
      "id, number, title, scope_md, terms_md, amount, status, sent_at, responded_at, response_note"
    )
    .eq("project_id", id)
    .neq("status", "draft")
    .order("number", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <Link
        href={`/client/projects/${id}`}
        className="text-xs font-medium app-muted hover:text-copper"
      >
        ← {project.title}
      </Link>
      <div className="mt-5">
        <span className="app-label">Pre-construction</span>
        <h1 className="mt-1 app-h1 !text-[26px]">Proposals</h1>
        <p className="mt-2 max-w-xl app-muted">
          Review the scope and price in one place. Your response becomes part of the project record.
        </p>
      </div>

      <div className="mt-8 space-y-5">
        {(proposals ?? []).map((proposal) => (
          <article key={proposal.id} className="app-card overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-navy/[0.08] px-5 py-5 md:px-7">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="app-label">Proposal #{proposal.number}</span>
                  <span
                    className={`app-badge ${
                      proposal.status === "accepted"
                        ? "app-badge-green"
                        : proposal.status === "declined" || proposal.status === "withdrawn"
                          ? "app-badge-neutral"
                          : "app-badge-amber"
                    }`}
                  >
                    {STATUS_LABELS[proposal.status] ?? proposal.status}
                  </span>
                </div>
                <h2 className="mt-2 app-h2 !text-[18px]">{proposal.title}</h2>
              </div>
              <p className="app-num text-[22px] font-semibold text-navy">
                {formatMoney(Number(proposal.amount))}
              </p>
            </div>

            <div className="px-5 py-6 md:px-7">
              <section>
                <h3 className="app-label">Scope</h3>
                <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-navy/80">
                  {proposal.scope_md}
                </div>
              </section>
              {proposal.terms_md && (
                <section className="mt-6 border-t border-navy/[0.08] pt-6">
                  <h3 className="app-label">Terms</h3>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-navy/70">
                    {proposal.terms_md}
                  </div>
                </section>
              )}

              {proposal.status === "sent" && (
                <form
                  action={async (formData) => {
                    "use server";
                    await clientRespondProposal(formData);
                  }}
                  className="mt-7 rounded-lg border border-copper/20 bg-copper/[0.04] p-4"
                >
                  <input type="hidden" name="id" value={proposal.id} />
                  <input type="hidden" name="project_id" value={id} />
                  <label htmlFor={`proposal-note-${proposal.id}`} className="app-label">
                    Note to the team <span className="normal-case tracking-normal">(optional)</span>
                  </label>
                  <textarea
                    id={`proposal-note-${proposal.id}`}
                    name="response_note"
                    rows={3}
                    className="mt-2 w-full"
                    placeholder="Questions or context for your response"
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="submit"
                      name="decision"
                      value="accepted"
                      className="app-btn app-btn-primary"
                    >
                      Accept proposal
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="declined"
                      className="app-btn app-btn-secondary"
                    >
                      Decline
                    </button>
                  </div>
                  <p className="mt-3 text-xs app-muted">
                    Accepting sets this amount as the project contract value.
                  </p>
                </form>
              )}

              {proposal.status !== "sent" && proposal.response_note && (
                <div className="mt-6 app-inset p-4 text-sm text-navy/75">
                  <span className="app-label">Response note</span>
                  <p className="mt-2 whitespace-pre-wrap">{proposal.response_note}</p>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {!proposals?.length && (
        <div className="app-card mt-8 px-6 py-14 text-center">
          <p className="text-sm app-muted">No proposals are ready for your review.</p>
        </div>
      )}
    </div>
  );
}
