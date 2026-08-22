import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  deleteContract,
  setContractStatus,
  updateContract,
} from "@/lib/actions/contracts";
import { hasUnmergedFields, usd } from "@/lib/contracts/standard-terms";
import { SubmitButton } from "@/components/admin/SubmitButton";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  out_for_signature: "Out for signature",
  signed: "Signed",
  void: "Void",
};

const STATUS_BADGES: Record<string, string> = {
  draft: "app-badge-neutral",
  out_for_signature: "app-badge-amber",
  signed: "app-badge-green",
  void: "app-badge-red",
};

export default async function AgreementPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: contract } = await supabase
    .from("project_contracts")
    .select("*, project:projects(id, title, street_address)")
    .eq("id", id)
    .single();
  if (!contract) notFound();

  const project = Array.isArray(contract.project) ? contract.project[0] : contract.project;

  const { data: signedDocs } = await supabase
    .from("project_documents")
    .select("id, title, created_at")
    .eq("project_id", contract.project_id)
    .eq("category", "contract")
    .order("created_at", { ascending: false });

  const locked = contract.status === "signed" || contract.status === "void";
  const unmerged = hasUnmergedFields(contract.body_md);

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Link
          href="/admin/contracts"
          className="text-[13px] font-medium text-copper hover:underline"
        >
          ← All contracts
        </Link>
        <h1 className="app-h1 mt-3">
          {project?.title} · Agreement #{contract.number}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm app-muted">
          <span className={`app-badge ${STATUS_BADGES[contract.status] ?? "app-badge-neutral"}`}>
            {STATUS_LABELS[contract.status] ?? contract.status}
          </span>
          <span>
            <span className="app-num">{usd(Number(contract.contract_price))}</span> ·{" "}
            {contract.owner_name}
            {contract.status_note ? ` · ${contract.status_note}` : ""}
          {contract.client_signature_text
            ? ` · signed in portal as ${contract.client_signature_text}`
            : ""}
          </span>
        </div>
        {contract.source_proposal_id && (
          <p className="mt-2 text-xs app-muted">
            Drafted from{" "}
            <Link
              href={`/admin/projects/${contract.project_id}/proposals`}
              className="text-copper hover:underline"
            >
              the accepted proposal
            </Link>
            . Price and scope were copied from that record.
          </p>
        )}
        <div className="mt-3 flex gap-5">
          <Link
            href={`/print/contract/${contract.id}`}
            target="_blank"
            className="text-[13px] font-medium text-copper hover:underline"
          >
            Print / save as PDF
          </Link>
        </div>
      </div>

      {unmerged && !locked && (
        <p className="mb-6 rounded-[10px] border border-amber-600/25 bg-amber-50 p-4 text-sm text-ink">
          This agreement still has unfilled placeholders (they look like{" "}
          <span className="font-mono">{"{{field}}"}</span>). Fill them in the
          text below before sending it out.
        </p>
      )}

      {/* ------------------------------------------------------ status -- */}
      <section className="mb-8 flex flex-wrap items-center gap-3">
        {contract.status === "draft" && (
          <form
            action={async (fd) => {
              "use server";
              await setContractStatus(fd);
            }}
          >
            <input type="hidden" name="id" value={contract.id} />
            <input type="hidden" name="status" value="out_for_signature" />
            <SubmitButton>Mark out for signature</SubmitButton>
          </form>
        )}
        {(contract.status === "draft" || contract.status === "out_for_signature") && (
          <form
            action={async (fd) => {
              "use server";
              await setContractStatus(fd);
            }}
            className="flex flex-wrap items-center gap-3"
          >
            <input type="hidden" name="id" value={contract.id} />
            <input type="hidden" name="status" value="signed" />
            <select name="signed_document_id" className="field-input !w-auto" defaultValue="">
              <option value="">Link signed PDF (optional)…</option>
              {(signedDocs ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
            <input
              name="status_note"
              className="field-input !w-52"
              placeholder="How it was signed (BoldSign, paper)"
            />
            <SubmitButton className="app-btn app-btn-secondary" pendingLabel="Marking…">
              Mark signed
            </SubmitButton>
          </form>
        )}
        {contract.status === "out_for_signature" && (
          <form
            action={async (fd) => {
              "use server";
              await setContractStatus(fd);
            }}
          >
            <input type="hidden" name="id" value={contract.id} />
            <input type="hidden" name="status" value="draft" />
            <button type="submit" className="text-xs text-copper hover:underline">
              Back to draft
            </button>
          </form>
        )}
        {contract.status !== "void" && contract.status !== "draft" && (
          <form
            action={async (fd) => {
              "use server";
              await setContractStatus(fd);
            }}
          >
            <input type="hidden" name="id" value={contract.id} />
            <input type="hidden" name="status" value="void" />
            <button type="submit" className="text-xs text-red-700 hover:underline">
              Void
            </button>
          </form>
        )}
        {contract.status === "draft" && (
          <form
            action={async (fd) => {
              "use server";
              await deleteContract(fd);
              redirect("/admin/contracts");
            }}
          >
            <input type="hidden" name="id" value={contract.id} />
            <input type="hidden" name="project_id" value={contract.project_id} />
            <button type="submit" className="text-xs text-red-700 hover:underline">
              Delete draft
            </button>
          </form>
        )}
      </section>

      {contract.status === "signed" && (
        <p className="mb-8 text-sm app-muted">
          Signed agreements are records and cannot be edited. The project&apos;s
          contract value was set to {usd(Number(contract.contract_price))} when
          this was marked signed.
          {contract.signed_document_id && (
            <>
              {" "}
              <Link
                href={`/api/documents/${contract.signed_document_id}/download`}
                className="text-copper hover:underline"
              >
                Download the signed PDF.
              </Link>
            </>
          )}
        </p>
      )}

      {/* -------------------------------------------------------- edit -- */}
      {locked ? (
        <pre className="app-card whitespace-pre-wrap p-6 text-[13px] leading-relaxed text-ink font-sans">
          {contract.body_md}
        </pre>
      ) : (
        <form
          action={async (fd) => {
            "use server";
            await updateContract(fd);
          }}
          className="space-y-5"
        >
          <input type="hidden" name="id" value={contract.id} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Title</label>
              <input name="title" defaultValue={contract.title} className="field-input" />
            </div>
            <div>
              <label className="field-label">Owner (legal name)</label>
              <input name="owner_name" defaultValue={contract.owner_name} className="field-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Contract price</label>
              <input
                name="contract_price"
                defaultValue={String(contract.contract_price)}
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Effective date</label>
              <input
                name="effective_date"
                type="date"
                defaultValue={contract.effective_date ?? ""}
                className="field-input"
              />
            </div>
          </div>
          <p className="text-xs app-muted">
            Price and date above are the tracked fields. Changing them does not
            rewrite the agreement text — keep the text below in step, including
            the written-out price.
          </p>
          <div>
            <label className="field-label">Agreement text</label>
            <textarea
              name="body_md"
              rows={38}
              defaultValue={contract.body_md}
              className="field-input font-mono !text-xs leading-relaxed"
            />
          </div>
          <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
        </form>
      )}
    </div>
  );
}
