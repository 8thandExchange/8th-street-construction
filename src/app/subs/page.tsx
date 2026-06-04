import { createClient } from "@/lib/supabase/server";
import { BidSubmitForm } from "@/components/subs/BidSubmitForm";

export const dynamic = "force-dynamic";

const BID_STATUS_LABELS: Record<string, string> = {
  invited: "Invited",
  viewed: "Viewed",
  submitted: "Submitted",
  shortlisted: "Shortlisted",
  awarded: "Awarded",
  declined: "Declined",
  withdrawn: "Withdrawn",
};

const BID_STATUS_COLORS: Record<string, string> = {
  invited: "border-copper/50 text-copper bg-copper/5",
  viewed: "border-blue-500/50 text-blue-600",
  submitted: "border-violet-500/50 text-violet-600",
  shortlisted: "border-amber-500/50 text-amber-600",
  awarded: "border-emerald-500/50 text-emerald-600 bg-emerald-50",
  declined: "border-stone-300 text-stone-300",
  withdrawn: "border-stone-300 text-stone-300",
};

export default async function SubsHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sub } = await supabase
    .from("subcontractors")
    .select("id, company_name, trade")
    .eq("profile_id", user!.id)
    .single();

  const { data: bids } = sub
    ? await supabase
        .from("bids")
        .select(
          "id, amount, status, submitted_at, notes, created_at, bid_requests(id, title, trade, scope_of_work, bid_deadline, status, projects(id, title, location))"
        )
        .eq("subcontractor_id", sub.id)
        .order("created_at", { ascending: false })
    : { data: null };

  return (
    <div className="px-6 md:px-10 lg:px-14 py-12 md:py-16 mx-auto max-w-7xl">
      <span className="eyebrow">— Welcome</span>
      <h1 className="mt-2 font-display text-display-md text-ink">
        {sub?.company_name || "Subcontractor Portal"}
      </h1>
      {sub?.trade && (
        <p className="mt-2 text-sm text-stone-300 font-mono tracking-wider uppercase">{sub.trade}</p>
      )}

      <div className="mt-12">
        <h2 className="font-display text-2xl text-ink mb-6">Bid Requests</h2>

        {bids && bids.length > 0 ? (
          <div className="space-y-4">
            {bids.map((b) => {
              const rawRfq = b.bid_requests;
              const rfq = (Array.isArray(rawRfq) ? rawRfq[0] : rawRfq) as {
                id: string;
                title: string;
                trade: string;
                scope_of_work: string;
                bid_deadline: string | null;
                status: string;
                projects: { title: string; location: string | null } | { title: string; location: string | null }[] | null;
              } | null;
              const project = rfq?.projects
                ? Array.isArray(rfq.projects)
                  ? rfq.projects[0]
                  : rfq.projects
                : null;
              const canSubmit =
                rfq?.status === "open" &&
                (b.status === "invited" || b.status === "viewed" || b.status === "submitted");

              return (
                <div key={b.id} className="bg-paper border border-ink/15 p-6">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-display text-xl text-ink">{rfq?.title}</h3>
                        <span
                          className={`text-[10px] font-mono tracking-[0.15em] uppercase px-2 py-1 border ${BID_STATUS_COLORS[b.status]}`}
                        >
                          {BID_STATUS_LABELS[b.status]}
                        </span>
                      </div>
                      <div className="text-sm text-ink/65">
                        Project: <strong>{project?.title || "—"}</strong>
                        {project?.location && <span> · {project.location}</span>}
                      </div>
                      <p className="mt-3 text-sm text-ink/80 leading-relaxed">{rfq?.scope_of_work}</p>
                      {rfq?.bid_deadline && (
                        <div className="mt-3 text-xs text-stone-300 font-mono">
                          Deadline: {new Date(rfq.bid_deadline).toLocaleDateString()}
                        </div>
                      )}
                      {b.notes && (
                        <p className="mt-3 text-xs text-ink/55 border-t border-ink/10 pt-3">
                          Your notes: {b.notes}
                        </p>
                      )}
                      <BidSubmitForm bidId={b.id} canSubmit={Boolean(canSubmit)} />
                    </div>
                    {b.amount != null && (
                      <div className="text-right shrink-0">
                        <div className="eyebrow text-stone-300 mb-1">Your Bid</div>
                        <div className="font-display text-2xl text-ink">
                          ${Number(b.amount).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-ink/15 p-12 text-center bg-paper">
            <p className="text-ink/50 italic">
              {sub
                ? "No active bid requests. We'll email you when there's a relevant opportunity."
                : "Your subcontractor profile isn't linked yet. Ask your project manager to connect your account in Admin → Subcontractors."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
