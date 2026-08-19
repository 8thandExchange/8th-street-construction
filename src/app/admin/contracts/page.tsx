import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NewContractForm } from "@/components/admin/NewContractForm";
import { deleteProjectDocument } from "@/lib/actions/documents";
import { createContractFromTemplate } from "@/lib/actions/contracts";
import { STANDARD_SINGLE_FAMILY_PRICE, usd } from "@/lib/contracts/standard-terms";
import { SubmitButton } from "@/components/admin/SubmitButton";

export const dynamic = "force-dynamic";

type ContractDocRow = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  visibility: string;
  file_size_bytes: number | null;
  created_at: string;
  project: {
    title: string;
    street_address: string | null;
  } | null;
};

type AgreementRow = {
  id: string;
  project_id: string;
  number: number;
  title: string;
  owner_name: string;
  contract_price: number;
  effective_date: string | null;
  status: string;
  created_at: string;
  project: { title: string } | null;
};

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

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export default async function ContractsPage() {
  const supabase = await createClient();

  const [{ data: agreementRows }, { data: docRows }, { data: projects }, { data: templates }] =
    await Promise.all([
      supabase
        .from("project_contracts")
        .select(
          "id, project_id, number, title, owner_name, contract_price, effective_date, status, created_at, project:projects(title)"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("project_documents")
        .select(
          "id, project_id, title, description, visibility, file_size_bytes, created_at, project:projects(title, street_address)"
        )
        .eq("category", "contract")
        .order("created_at", { ascending: false }),
      supabase.from("projects").select("id, title, street_address").order("title"),
      supabase
        .from("contract_templates")
        .select("id, name, project_type")
        .order("project_type"),
    ]);

  const agreements = (agreementRows ?? []) as unknown as AgreementRow[];
  const contracts = (docRows ?? []) as unknown as ContractDocRow[];

  const groups = new Map<string, ContractDocRow[]>();
  for (const c of contracts) {
    const list = groups.get(c.project_id) ?? [];
    list.push(c);
    groups.set(c.project_id, list);
  }

  async function draftAgreement(fd: FormData) {
    "use server";
    const { id } = await createContractFromTemplate(fd);
    redirect(`/admin/contracts/${id}`);
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="app-h1">Contracts</h1>
          <p className="text-sm app-muted mt-2 max-w-2xl">
            Every agreement across every job. Draft new ones from the company
            standard, edit them per job, and keep the signed PDFs on record.
            Files are private — downloads use signed links and only admins see
            this page.
          </p>
        </div>
        <Link
          href="/admin/contracts/templates"
          className="text-[13px] font-medium text-copper hover:underline shrink-0 mt-2"
        >
          Standard terms
        </Link>
      </div>

      {/* ------------------------------------------------- agreements -- */}
      <section className="mb-12">
        <div className="flex items-baseline justify-between gap-4 border-b border-ink/10 pb-2 mb-4">
          <h2 className="app-h2">Agreements</h2>
        </div>

        <details className="app-card mb-6">
          <summary className="cursor-pointer px-5 py-4 text-[13px] font-medium text-copper">
            + Draft agreement from the standard
          </summary>
          <form action={draftAgreement} className="p-6 pt-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Job *</label>
                <select name="project_id" required className="field-input" defaultValue="">
                  <option value="" disabled>
                    Choose a job…
                  </option>
                  {(projects ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Standard *</label>
                <select name="template_id" required className="field-input" defaultValue="">
                  <option value="" disabled>
                    Choose a standard…
                  </option>
                  {(templates ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Owner (legal name) *</label>
                <input
                  name="owner_name"
                  required
                  className="field-input"
                  placeholder="Habitat for Humanity — CSRA, Inc."
                />
              </div>
              <div>
                <label className="field-label">Owner entity description</label>
                <input
                  name="owner_entity_description"
                  className="field-input"
                  placeholder="a Georgia nonprofit corporation"
                />
              </div>
            </div>
            <div>
              <label className="field-label">Property address (with county and zip) *</label>
              <input
                name="property_address"
                required
                className="field-input"
                placeholder="608 Macon Avenue, Augusta, Richmond County, Georgia 30901"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="field-label">Contract price *</label>
                <input
                  name="contract_price"
                  required
                  className="field-input"
                  defaultValue={usd(STANDARD_SINGLE_FAMILY_PRICE)}
                />
                <p className="mt-1 text-xs app-muted">
                  The single-family standard. Change it only for multifamily or
                  a job priced differently.
                </p>
              </div>
              <div>
                <label className="field-label">Effective date *</label>
                <input name="effective_date" type="date" required className="field-input" />
              </div>
              <div>
                <label className="field-label">County</label>
                <input name="county" className="field-input" placeholder="Richmond" />
              </div>
            </div>
            <div>
              <label className="field-label">Plans description</label>
              <input
                name="plans_description"
                className="field-input"
                placeholder="the Booker + Vick Architects permit set, Job No. 2615, dated May 21, 2026"
              />
            </div>
            <div>
              <label className="field-label">Scope summary (Exhibit A paragraph)</label>
              <textarea
                name="scope_description"
                rows={3}
                className="field-input"
                placeholder="The Work includes the full scope of construction shown in the plans: site preparation and erosion control; foundation; framing and dry-in; …"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Owner signatory</label>
                <input name="owner_signatory" className="field-input" placeholder="Bernadette Kelliher, CEO" />
              </div>
              <div>
                <label className="field-label">Project name (lien waiver)</label>
                <input name="project_name" className="field-input" placeholder="608 Macon Avenue Residence" />
              </div>
            </div>
            <SubmitButton pendingLabel="Drafting…">Draft agreement</SubmitButton>
          </form>
        </details>

        <ul className="space-y-3">
          {agreements.map((a) => (
            <li
              key={a.id}
              className="app-card flex items-center justify-between gap-4 p-5"
            >
              <div>
                <Link href={`/admin/contracts/${a.id}`} className="font-medium text-ink hover:text-copper">
                  {a.project?.title ?? "Unknown job"} · Agreement #{a.number} — {a.title}
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs app-muted">
                  <span className={`app-badge ${STATUS_BADGES[a.status] ?? "app-badge-neutral"}`}>
                    {STATUS_LABELS[a.status] ?? a.status}
                  </span>
                  <span>
                    {a.owner_name} · <span className="app-num">{usd(Number(a.contract_price))}</span>
                    {a.effective_date ? ` · effective ${fmtDate(a.effective_date)}` : ""}
                  </span>
                </div>
              </div>
              <Link
                href={`/admin/contracts/${a.id}`}
                className="text-[13px] font-medium text-copper hover:underline shrink-0"
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
        {!agreements.length && (
          <p className="app-card p-10 text-center text-sm italic app-muted">
            No drafted agreements yet. Use <strong>Draft agreement from the standard</strong> above.
          </p>
        )}
      </section>

      {/* ------------------------------------------------ signed files -- */}
      <section>
        <div className="flex items-baseline justify-between gap-4 border-b border-ink/10 pb-2 mb-4">
          <h2 className="app-h2">Signed files on record</h2>
          <NewContractForm
            projects={(projects ?? []).map((p) => ({ id: p.id, title: p.title }))}
          />
        </div>

        <div className="space-y-10">
          {[...groups.entries()].map(([projectId, docs]) => {
            const project = docs[0]?.project;
            return (
              <section key={projectId}>
                <div className="flex items-baseline justify-between gap-4 pb-2 mb-3">
                  <h3 className="text-sm font-medium text-ink">
                    {project?.title ?? "Unknown job"}
                    {project?.street_address ? (
                      <span className="text-ink/50 font-normal"> · {project.street_address}</span>
                    ) : null}
                  </h3>
                  <Link
                    href={`/admin/projects/${projectId}/documents`}
                    className="text-[13px] font-medium text-copper hover:underline shrink-0"
                  >
                    Job files
                  </Link>
                </div>
                <ul className="space-y-3">
                  {docs.map((d) => (
                    <li
                      key={d.id}
                      className="app-card flex items-center justify-between gap-4 p-5"
                    >
                      <div>
                        <div className="font-medium text-ink">{d.title}</div>
                        {d.description && (
                          <div className="text-sm app-muted mt-1">{d.description}</div>
                        )}
                        <div className="text-xs app-muted mt-1">
                          Added {fmtDate(d.created_at)} · {d.visibility}
                          {d.file_size_bytes
                            ? ` · ${Math.round(d.file_size_bytes / 1024)} KB`
                            : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <Link
                          href={`/api/documents/${d.id}/download`}
                          className="text-[13px] font-medium text-copper hover:underline"
                        >
                          Download
                        </Link>
                        <form
                          action={async (fd) => {
                            "use server";
                            await deleteProjectDocument(fd);
                          }}
                        >
                          <input type="hidden" name="id" value={d.id} />
                          <input type="hidden" name="project_id" value={d.project_id} />
                          <button type="submit" className="text-xs text-red-700 hover:underline">
                            Delete
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        {!contracts.length && (
          <p className="app-card p-10 text-center text-sm italic app-muted">
            No signed contract files on record yet.
          </p>
        )}
      </section>
    </div>
  );
}
