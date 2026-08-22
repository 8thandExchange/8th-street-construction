import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

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
  invited: "app-badge-blue",
  viewed: "app-badge-blue",
  submitted: "app-badge-amber",
  shortlisted: "app-badge-amber",
  awarded: "app-badge-green",
  declined: "app-badge-red",
  withdrawn: "app-badge-neutral",
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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <span className="app-label">Trade partner portal</span>
      <h1 className="mt-2 app-h1 !text-[26px]">
        {sub?.company_name || "Subcontractor Portal"}
      </h1>
      {sub?.trade && (
        <p className="mt-2 text-sm app-muted">{sub.trade}</p>
      )}

      <div className="mt-8">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="app-h2 !text-[17px]">Bid requests</h2>
          <span className="text-xs app-muted">{bids?.length ?? 0} total</span>
        </div>

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
              return (
                <Link
                  key={b.id}
                  href={`/subs/bids/${b.id}`}
                  className="app-card app-card-hover block p-5 md:p-6"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="app-h2 !text-[16px]">{rfq?.title}</h3>
                        <span
                          className={`app-badge ${BID_STATUS_COLORS[b.status]}`}
                        >
                          {BID_STATUS_LABELS[b.status]}
                        </span>
                      </div>
                      <div className="text-sm text-ink/65">
                        Project: <strong>{project?.title || "—"}</strong>
                        {project?.location && <span> · {project.location}</span>}
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink/70">
                        {rfq?.scope_of_work}
                      </p>
                      {rfq?.bid_deadline && (
                        <div className="mt-3 text-xs text-stone-300 font-mono">
                          Deadline: {new Date(rfq.bid_deadline).toLocaleDateString()}
                        </div>
                      )}
                      <p className="mt-4 text-[13px] font-medium text-copper">
                        Review and respond →
                      </p>
                    </div>
                    {b.amount != null && (
                      <div className="text-right shrink-0">
                        <div className="app-label mb-1">Your bid</div>
                        <div className="app-num text-xl font-semibold text-ink">
                          ${Number(b.amount).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
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
