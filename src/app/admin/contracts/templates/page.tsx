import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { updateContractTemplate } from "@/lib/actions/contracts";

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
          className="font-mono text-[10px] tracking-[0.15em] uppercase text-copper hover:underline"
        >
          ← All contracts
        </Link>
        <h1 className="app-h1 mt-3">Standard terms</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
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
          <details key={t.id} className="border border-ink/15 bg-paper">
            <summary className="cursor-pointer px-5 py-4">
              <span className="font-medium text-ink">{t.name}</span>
              <span className="ml-3 text-xs font-mono text-stone-300 uppercase tracking-wider">
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
              <button type="submit" className="app-btn app-btn-primary">
                Save standard
              </button>
            </form>
          </details>
        ))}
      </div>

      {!templates?.length && (
        <p className="text-ink/50 italic py-12 text-center border border-dashed border-ink/20">
          No standards installed yet.
        </p>
      )}
    </div>
  );
}
