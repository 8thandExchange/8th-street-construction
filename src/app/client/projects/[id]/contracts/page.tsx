import Link from "next/link";
import { clientSignContract } from "@/lib/actions/contracts";
import { formatMoney } from "@/lib/billing/constants";
import { requireClientProjectFeature } from "@/lib/portal/access";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  out_for_signature: "Ready to sign",
  signed: "Signed",
};

export default async function ClientContractsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const { supabase, project } = await requireClientProjectFeature(id, "contracts");
  const { data: contracts } = await supabase
    .from("project_contracts")
    .select(
      "id, number, title, owner_name, contract_price, effective_date, body_md, status, client_signature_text, client_signed_at"
    )
    .eq("project_id", id)
    .in("status", ["out_for_signature", "signed"])
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
        <h1 className="mt-1 app-h1 !text-[26px]">Agreements</h1>
        <p className="mt-2 max-w-xl app-muted">
          Review the construction agreement. Signing with your typed legal name
          becomes part of the project record.
        </p>
      </div>

      <div className="mt-8 space-y-5">
        {(contracts ?? []).map((contract) => (
          <article key={contract.id} className="app-card overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-navy/[0.08] px-5 py-5 md:px-7">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="app-label">Agreement #{contract.number}</span>
                  <span
                    className={`app-badge ${
                      contract.status === "signed" ? "app-badge-green" : "app-badge-amber"
                    }`}
                  >
                    {STATUS_LABELS[contract.status] ?? contract.status}
                  </span>
                </div>
                <h2 className="mt-2 app-h2 !text-[18px]">{contract.title}</h2>
                <p className="mt-1 text-xs app-muted">{contract.owner_name}</p>
              </div>
              <p className="app-num text-[22px] font-semibold text-navy">
                {formatMoney(Number(contract.contract_price))}
              </p>
            </div>

            <div className="px-5 py-6 md:px-7">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-navy/80">
                {contract.body_md}
              </pre>

              {contract.status === "out_for_signature" && (
                <form
                  action={async (formData) => {
                    "use server";
                    await clientSignContract(formData);
                  }}
                  className="mt-7 rounded-lg border border-copper/20 bg-copper/[0.04] p-4"
                >
                  <input type="hidden" name="id" value={contract.id} />
                  <input type="hidden" name="project_id" value={id} />
                  <label htmlFor={`sign-${contract.id}`} className="app-label">
                    Type your full legal name to sign
                  </label>
                  <input
                    id={`sign-${contract.id}`}
                    name="signature_text"
                    required
                    className="mt-2 w-full"
                    placeholder="Full legal name"
                  />
                  <button type="submit" className="app-btn app-btn-primary mt-4">
                    Sign agreement
                  </button>
                  <p className="mt-3 text-xs app-muted">
                    Signing sets this amount as the project contract value.
                  </p>
                </form>
              )}

              {contract.status === "signed" && contract.client_signature_text && (
                <div className="mt-6 app-inset p-4 text-sm text-navy/75">
                  <span className="app-label">Signed</span>
                  <p className="mt-2">
                    {contract.client_signature_text}
                    {contract.client_signed_at
                      ? ` · ${new Date(contract.client_signed_at).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}`
                      : ""}
                  </p>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {!contracts?.length && (
        <div className="app-card mt-8 px-6 py-14 text-center">
          <p className="text-sm app-muted">No agreements are ready for your review.</p>
        </div>
      )}
    </div>
  );
}
