import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { minutesMarkdownToHtml } from "@/lib/meetings/minutes-format";
import { EMAIL_BRAND } from "@/lib/email/brand";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Print-ready proposal — print to PDF from the browser, or hand on paper. */
export default async function ProposalPrintPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/admin`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/admin");

  const { data: proposal } = await supabase
    .from("project_proposals")
    .select("*, projects(title, location, street_address)")
    .eq("id", id)
    .single();
  if (!proposal) notFound();

  const project = Array.isArray(proposal.projects) ? proposal.projects[0] : proposal.projects;
  const { ink, pencil, rust, border } = EMAIL_BRAND;
  const scopeHtml = minutesMarkdownToHtml(proposal.scope_md, { ink, pencil, rust, border });
  const termsHtml = proposal.terms_md
    ? minutesMarkdownToHtml(proposal.terms_md, { ink, pencil, rust, border })
    : null;

  return (
    <div className="mx-auto max-w-2xl bg-white p-10 print:p-0 text-ink">
      <div className="mb-2 flex items-baseline justify-between border-b-2 border-ink/80 pb-4">
        <div>
          <div className="font-display text-2xl">8th Street Construction</div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-ink/50">
            Proposal #{proposal.number}
          </div>
        </div>
        <div className="text-right text-sm text-ink/60">
          {new Date(proposal.created_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      </div>

      <h1 className="mt-6 font-display text-xl">{proposal.title}</h1>
      <p className="mt-1 text-sm text-ink/60">
        {[project?.title, project?.street_address, project?.location].filter(Boolean).join(" · ")}
      </p>

      <div className="mt-6 border-l-2 pl-4" style={{ borderColor: rust }}>
        <div className="text-xs uppercase tracking-[0.14em] text-ink/50">Proposed price</div>
        <div className="mt-1 font-display text-3xl">{usd(Number(proposal.amount))}</div>
      </div>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
        Scope of work
      </h2>
      <div className="prose-sm mt-2" dangerouslySetInnerHTML={{ __html: scopeHtml }} />

      {termsHtml && (
        <>
          <h2 className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
            Terms
          </h2>
          <div className="prose-sm mt-2" dangerouslySetInnerHTML={{ __html: termsHtml }} />
        </>
      )}

      <div className="mt-12 grid grid-cols-2 gap-10 border-t border-ink/20 pt-8 text-sm">
        <div>
          <div className="h-10 border-b border-ink/40" />
          <div className="mt-1 text-xs text-ink/50">Accepted by (signature)</div>
        </div>
        <div>
          <div className="h-10 border-b border-ink/40" />
          <div className="mt-1 text-xs text-ink/50">Date</div>
        </div>
      </div>

      <p className="mt-10 text-center text-[10px] text-ink/40 print:hidden">
        Use your browser&apos;s print dialog to save this as a PDF.
      </p>
    </div>
  );
}
