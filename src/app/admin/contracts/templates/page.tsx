import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { updateContractTemplate } from "@/lib/actions/contracts";
import { SubmitButton } from "@/components/admin/SubmitButton";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  single_family: "Single-family",
  multifamily: "Multifamily",
};

export default async function ContractTemplatesPage() {
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("contract_templates")
    .select("*")
    .order("project_type");

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Link
          href="/admin/contracts"
          className="text-[13px] font-medium text-copper hover:underline"
        >
          ← All contracts
        </Link>
        <h1 className="app-h1 mt-3">Standard terms</h1>
        <p className="text-sm app-muted mt-2 max-w-2xl">
          The company&apos;s standard agreements. Editing a standard changes
          future drafts only — agreements already drafted keep their text.
          Placeholders like <span className="font-mono">{"{{owner_name}}"}</span>{" "}
          are filled from the job specifics when a draft is created. These are
          templates, not legal advice: run material changes past a Georgia
          construction attorney.
        </p>
      </div>

      <div className="space-y-6">
        {(templates ?? []).map((t) => (
          <details key={t.id} className="app-card">
            <summary className="cursor-pointer px-5 py-4">
              <span className="font-medium text-ink">{t.name}</span>
              <span className="app-badge app-badge-neutral ml-3">
                {TYPE_LABELS[t.project_type] ?? t.project_type}
              </span>
            </summary>
            <form
              action={async (fd) => {
                "use server";
                await updateContractTemplate(fd);
              }}
              className="p-6 pt-2 space-y-4"
            >
              <input type="hidden" name="id" value={t.id} />
              <div>
                <label className="field-label">Name</label>
                <input name="name" defaultValue={t.name} className="field-input" />
              </div>
              <div>
                <label className="field-label">Notes (when to use, open legal items)</label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={t.notes ?? ""}
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Template text</label>
                <textarea
                  name="body_md"
                  rows={38}
                  defaultValue={t.body_md}
                  className="field-input font-mono !text-xs leading-relaxed"
                />
              </div>
              <SubmitButton pendingLabel="Saving…">Save standard</SubmitButton>
            </form>
          </details>
        ))}
      </div>

      {!templates?.length && (
        <p className="app-card p-10 text-center text-sm italic app-muted">
          No standards installed yet.
        </p>
      )}
    </div>
  );
}
