import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BidSubmitForm } from "@/components/subs/BidSubmitForm";
import { formatMoney } from "@/lib/billing/constants";

export const dynamic = "force-dynamic";

const STATUS_BADGES: Record<string, string> = {
  invited: "app-badge-blue",
  viewed: "app-badge-blue",
  submitted: "app-badge-amber",
  shortlisted: "app-badge-amber",
  awarded: "app-badge-green",
  declined: "app-badge-red",
  withdrawn: "app-badge-neutral",
};

export default async function SubcontractorBidPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: sub } = await supabase
    .from("subcontractors")
    .select("id, company_name, trade")
    .eq("profile_id", user.id)
    .single();
  if (!sub) notFound();

  const { data: bid } = await supabase
    .from("bids")
    .select(
      "id, amount, status, submitted_at, notes, alternates, exclusions, qualifications, document_id, bid_requests(id, title, trade, scope_of_work, bid_deadline, status, projects(id, title, location))"
    )
    .eq("id", id)
    .eq("subcontractor_id", sub.id)
    .single();
  if (!bid) notFound();

  const rawRequest = bid.bid_requests;
  const request = Array.isArray(rawRequest) ? rawRequest[0] : rawRequest;
  if (!request) notFound();
  const rawProject = request.projects;
  const project = Array.isArray(rawProject) ? rawProject[0] : rawProject;
  const deadlinePassed = Boolean(
    request.bid_deadline && new Date(request.bid_deadline).getTime() < Date.now()
  );
  const canSubmit =
    request.status === "open" &&
    !deadlinePassed &&
    ["invited", "viewed", "submitted", "shortlisted"].includes(bid.status);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <Link href="/subs" className="text-xs font-medium app-muted hover:text-copper">
        ← Active bids
      </Link>

      <header className="mt-5 app-card p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="app-label">{request.trade}</span>
              <span className={`app-badge ${STATUS_BADGES[bid.status] ?? "app-badge-neutral"}`}>
                {bid.status.replace("_", " ")}
              </span>
            </div>
            <h1 className="mt-2 app-h1 !text-[24px] md:!text-[28px]">{request.title}</h1>
            <p className="mt-2 text-sm app-muted">
              {project?.title ?? "Project"}
              {project?.location ? ` · ${project.location}` : ""}
            </p>
          </div>
          {bid.amount != null && (
            <div className="text-right">
              <p className="app-label">Your bid</p>
              <p className="app-num mt-1 text-[24px] font-semibold text-navy">
                {formatMoney(Number(bid.amount))}
              </p>
            </div>
          )}
        </div>
        {request.bid_deadline && (
          <div className={`mt-5 app-inset p-3 text-sm ${deadlinePassed ? "text-red-700" : "text-navy/75"}`}>
            {deadlinePassed ? "Deadline passed" : "Bid due"}{" "}
            {new Date(request.bid_deadline).toLocaleString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
        )}
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="app-card p-5 md:p-7">
          <span className="app-label">Scope of work</span>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-navy/80">
            {request.scope_of_work}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="app-card p-5">
            <h2 className="app-h2">Your response</h2>
            {bid.submitted_at && (
              <p className="mt-1 text-xs app-muted">
                Last submitted{" "}
                {new Date(bid.submitted_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            )}
            {bid.document_id && (
              <a
                href={`/api/sub-bids/${bid.id}/document`}
                target="_blank"
                rel="noreferrer"
                className="app-inset mt-4 flex items-center gap-2 p-3 text-sm font-medium text-navy hover:text-copper"
              >
                <FileText size={16} strokeWidth={1.75} />
                Open submitted document
              </a>
            )}
            <BidSubmitForm
              bidId={bid.id}
              canSubmit={canSubmit}
              initialAmount={bid.amount == null ? null : Number(bid.amount)}
              initialNotes={bid.notes}
              initialAlternates={bid.alternates}
              initialExclusions={bid.exclusions}
              initialQualifications={bid.qualifications}
            />
            {!canSubmit && (
              <p className="mt-4 text-sm app-muted">
                This request is closed. Contact the project manager if your response needs to change.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
