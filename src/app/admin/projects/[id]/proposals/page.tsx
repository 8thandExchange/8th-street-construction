import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import {
  createProposal,
  deleteProposal,
  sendProposal,
  setProposalStatus,
} from "@/lib/actions/proposals";
import { formatMoney } from "@/lib/billing/constants";
import { SubmitButton } from "@/components/admin/SubmitButton";

export const dynamic = "force-dynamic";

type ProposalRow = {
  id: string;
  number: number;
  title: string;
  scope_md: string;
  terms_md: string | null;
  amount: number | string;
  status: "draft" | "sent" | "accepted" | "declined" | "withdrawn";
  sent_at: string | null;
  responded_at: string | null;
  response_note: string | null;
};

const STATUS_TONES: Record<ProposalRow["status"], string> = {
  draft: "app-badge-neutral",
  sent: "app-badge-blue",
  accepted: "app-badge-green",
  declined: "app-badge-red",
  withdrawn: "app-badge-neutral",
};

async function createProposalAction(formData: FormData) {
  "use server";
  await createProposal(formData);
}

async function sendProposalAction(formData: FormData) {
  "use server";
  await sendProposal(formData);
}

async function setStatusAction(formData: FormData) {
  "use server";
  await setProposalStatus(formData);
}

async function deleteProposalAction(formData: FormData) {
  "use server";
  await deleteProposal(formData);
}

export default async function ProjectProposalsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();

  const [{ data: project }, { data: rows }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, estimated_cost, contract_value, client_id")
      .eq("id", id)
      .single(),
    supabase
      .from("project_proposals")
      .select("*")
      .eq("project_id", id)
      .order("number", { ascending: false }),
  ]);
  if (!project) notFound();

  const proposals = (rows ?? []) as ProposalRow[];
  const suggested =
    Number(project.contract_value ?? 0) || Number(project.estimated_cost ?? 0) || "";

  return (
    <div className="max-w-3xl">
      <h2 className="app-h2 mb-2">Proposals</h2>
      <p className="text-sm app-muted mb-8">
        The customer-facing offer: scope, price, and the record of how the answer came back.
        Accepting one sets the project&apos;s contract value.
      </p>

      <form action={createProposalAction} className="app-card space-y-5 p-6 md:p-8 mb-10">
        <input type="hidden" name="project_id" value={id} />
        <h3 className="app-h2 !text-[16px]">New proposal</h3>
        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
          <div>
            <label className="field-label">Title *</label>
            <input
              name="title"
              required
              placeholder={`e.g. ${project.title} — full build`}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Price ($) *</label>
            <input
              name="amount"
              type="number"
              step="0.01"
              required
              defaultValue={suggested}
              className="field-input"
            />
          </div>
        </div>
        <div>
          <label className="field-label">Scope of work *</label>
          <textarea
            name="scope_md"
            required
            rows={8}
            placeholder={"What we will build, in full sentences. Headings with ## and lists with - format nicely in the email and print versions."}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Terms (payment schedule, exclusions)</label>
          <textarea name="terms_md" rows={4} className="field-input" />
        </div>
        <SubmitButton>Create draft</SubmitButton>
      </form>

      <ul className="space-y-4">
        {proposals.map((p) => (
          <li key={p.id} className="app-card p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs app-muted tabular-nums">#{p.number}</span>
              <h3 className="app-h2">{p.title}</h3>
              <span className={`app-badge ${STATUS_TONES[p.status]}`}>{p.status}</span>
              <span className="ml-auto text-[15px] app-num text-navy">
                {formatMoney(Number(p.amount))}
              </span>
            </div>
            <p className="mt-2 text-xs app-muted">
              {[
                p.sent_at &&
                  `Sent ${new Date(p.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
                p.responded_at &&
                  `Answered ${new Date(p.responded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
                p.response_note,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <details className="mt-3">
              <summary className="cursor-pointer list-none text-xs text-copper hover:underline">
                Read scope
              </summary>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-ink/75">
                {p.scope_md}
                {p.terms_md ? `\n\nTERMS\n${p.terms_md}` : ""}
              </pre>
            </details>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link href={`/print/proposal/${p.id}`} className="app-btn !h-8 !px-3 !text-xs">
                Print / PDF
              </Link>
              {["draft", "sent"].includes(p.status) && (
                <form action={sendProposalAction}>
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="id" value={p.id} />
                  <SubmitButton className="app-btn app-btn-secondary !h-8 !px-3 !text-xs" pendingLabel="Sending…">
                    {p.status === "sent" ? "Send again" : "Email to client"}
                  </SubmitButton>
                </form>
              )}
              {p.status === "sent" && (
                <form action={setStatusAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="id" value={p.id} />
                  <input
                    name="response_note"
                    placeholder="How they answered (signed PDF, email…)"
                    className="!h-8 w-56 !text-xs"
                  />
                  <button
                    type="submit"
                    name="status"
                    value="accepted"
                    className="app-btn app-btn-accent !h-8 !px-3 !text-xs"
                  >
                    Accepted
                  </button>
                  <button
                    type="submit"
                    name="status"
                    value="declined"
                    className="app-btn app-btn-ghost !h-8 !px-3 !text-xs"
                  >
                    Declined
                  </button>
                </form>
              )}
              {p.status === "draft" && (
                <form action={deleteProposalAction}>
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className="text-xs text-red-700 hover:underline">
                    Delete draft
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
      {proposals.length === 0 && (
        <div className="app-card p-10 text-center text-sm italic app-muted">
          No proposals yet. The first one turns your estimate into an offer.
        </div>
      )}
    </div>
  );
}
