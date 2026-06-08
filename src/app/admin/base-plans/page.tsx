import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function BasePlansPage() {
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("house_base_plans")
    .select(
      "id, plan_number, name, designer, variant, sheet_count, file_size_bytes, display_order, active, notes"
    )
    .order("display_order");

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl text-ink">Base House Plans</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          Craig Peel catalog selected for 8th Street Construction. Assign a base plan to each lot
          project — every lot will need revisions against its plat before build.
        </p>
      </div>

      <div className="space-y-4">
        {(plans ?? []).map((plan) => (
          <article
            key={plan.id}
            className="bg-paper border border-ink/15 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="font-mono text-xs text-stone-300">#{plan.plan_number}</span>
                <h2 className="font-display text-xl text-ink">{plan.name}</h2>
                {plan.variant && (
                  <span className="text-[10px] font-mono tracking-[0.15em] uppercase px-2 py-0.5 border border-ink/20 text-ink/70">
                    {plan.variant}
                  </span>
                )}
                {!plan.active && (
                  <span className="text-[10px] font-mono tracking-[0.15em] uppercase px-2 py-0.5 border border-red-200 text-red-700">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-sm text-ink/60">
                {plan.designer}
                {plan.sheet_count ? ` · ${plan.sheet_count} sheets` : ""}
                {" · "}
                {formatBytes(plan.file_size_bytes)}
              </p>
              {plan.notes && <p className="text-sm text-ink/75 mt-2">{plan.notes}</p>}
            </div>
            <Link
              href={`/api/base-plans/${plan.id}/download`}
              className="inline-flex h-10 items-center px-5 border border-ink/20 font-mono text-[10px] tracking-[0.2em] uppercase text-copper hover:border-copper transition-colors shrink-0"
            >
              Download PDF
            </Link>
          </article>
        ))}
      </div>

      {!plans?.length && (
        <p className="text-ink/50 italic py-16 text-center border border-dashed border-ink/20">
          No base plans in the catalog yet. Run{" "}
          <code className="font-mono text-xs">npx tsx scripts/seed-base-plans.ts</code> to import
          the Craig Peel PDFs.
        </p>
      )}
    </div>
  );
}
