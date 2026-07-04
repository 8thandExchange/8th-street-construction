import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/portal/features";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import {
  clientApproveSelection,
  clientChooseSelectionOption,
} from "@/lib/actions/selections";
import {
  SELECTION_STATUS_LABELS,
  SELECTION_STATUS_STYLES,
} from "@/lib/project/labels";

export const dynamic = "force-dynamic";

type SelectionOption = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price: number | null;
  vendor: string | null;
  display_order: number;
};

function money(n: number) {
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default async function ClientSelectionsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, title, portal_features").eq("id", id).single();
  if (!project) notFound();
  if (!isFeatureEnabled(project.portal_features, "selections")) notFound();


  const { data: items } = await supabase
    .from("project_selections")
    .select("*, selection_options(id, title, description, image_url, price, vendor, display_order)")
    .eq("project_id", id)
    .eq("client_visible", true)
    .order("due_date", { ascending: true, nullsFirst: false });

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-3xl">
      <Link
        href={`/client/projects/${id}`}
        className="text-xs font-mono tracking-[0.18em] uppercase text-stone-300 hover:text-ink transition-colors"
      >
        ← Overview
      </Link>
      <h2 className="mt-4 font-display text-xl text-ink mb-2">Selections</h2>
      <p className="mt-2 text-sm text-ink/60">
        Finish selections for your home. When options are posted, pick your favorite — your
        builder is notified instantly.
      </p>

      <ul className="mt-10 space-y-6">
        {(items ?? []).map((item) => {
          const options = ((item.selection_options ?? []) as SelectionOption[]).sort(
            (a, b) => a.display_order - b.display_order
          );
          const allowance = item.allowance_amount != null ? Number(item.allowance_amount) : null;
          const decided = item.status === "approved" || item.selected_option_id;
          const canChoose = item.status === "client_review" && !decided;

          return (
            <li key={item.id} className="p-6 border border-ink/15 bg-paper">
              <div className="flex justify-between gap-4">
                <div>
                  <h3 className="font-medium text-ink">{item.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-stone-300 uppercase">
                      {item.category.replace(/_/g, " ")}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-[0.1em] px-2 py-0.5 border ${
                        SELECTION_STATUS_STYLES[item.status] ??
                        "bg-stone-100 text-stone-500 border-stone-200"
                      }`}
                    >
                      {SELECTION_STATUS_LABELS[item.status] ?? item.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
                {allowance != null && (
                  <div className="text-right font-mono text-sm">
                    {money(allowance)}
                    <div className="text-[10px] text-stone-300 uppercase">allowance</div>
                  </div>
                )}
              </div>

              {item.product_spec && (
                <p className="mt-3 text-sm text-ink/70 whitespace-pre-wrap">{item.product_spec}</p>
              )}
              {item.vendor && <p className="mt-2 text-xs text-stone-300">Vendor: {item.vendor}</p>}
              {item.due_date && (
                <p className="mt-2 text-xs font-mono text-copper">Decision by {item.due_date}</p>
              )}

              {options.length > 0 && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {options.map((opt) => {
                    const isChosen = item.selected_option_id === opt.id;
                    const delta =
                      allowance != null && opt.price != null ? Number(opt.price) - allowance : null;
                    return (
                      <div
                        key={opt.id}
                        className={`flex flex-col border ${
                          isChosen ? "border-copper ring-1 ring-copper" : "border-ink/15"
                        } bg-bone`}
                      >
                        {opt.image_url && (
                          <div className="relative aspect-[4/3] overflow-hidden bg-ink/5">
                            <Image
                              src={opt.image_url}
                              alt={opt.title}
                              fill
                              sizes="(max-width: 640px) 100vw, 320px"
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex flex-1 flex-col p-4">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium text-ink">{opt.title}</h4>
                            {opt.price != null && (
                              <div className="text-right font-mono text-sm text-ink">
                                {money(Number(opt.price))}
                              </div>
                            )}
                          </div>
                          {delta != null && delta !== 0 && (
                            <span
                              className={`mt-1 self-start text-[10px] font-mono uppercase tracking-[0.1em] px-1.5 py-0.5 border ${
                                delta > 0
                                  ? "text-amber-700 border-amber-300 bg-amber-50"
                                  : "text-emerald-700 border-emerald-300 bg-emerald-50"
                              }`}
                            >
                              {delta > 0
                                ? `${money(delta)} over allowance`
                                : `${money(-delta)} under allowance`}
                            </span>
                          )}
                          {opt.description && (
                            <p className="mt-2 text-xs leading-relaxed text-ink/70">
                              {opt.description}
                            </p>
                          )}
                          {opt.vendor && (
                            <p className="mt-1 text-[11px] text-stone-300">{opt.vendor}</p>
                          )}

                          <div className="mt-auto pt-3">
                            {isChosen ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-copper">
                                <CheckCircle2 size={14} /> Your choice
                              </span>
                            ) : canChoose ? (
                              <form
                                action={async (fd) => {
                                  "use server";
                                  await clientChooseSelectionOption(fd);
                                }}
                              >
                                <input type="hidden" name="project_id" value={id} />
                                <input type="hidden" name="selection_id" value={item.id} />
                                <input type="hidden" name="option_id" value={opt.id} />
                                <button
                                  type="submit"
                                  className="h-9 w-full bg-copper text-bone font-mono text-[10px] uppercase tracking-[0.1em] hover:opacity-90"
                                >
                                  Choose this
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {options.length === 0 && item.status === "client_review" && (
                <form
                  action={async (fd) => {
                    "use server";
                    await clientApproveSelection(fd);
                  }}
                  className="mt-4"
                >
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="project_id" value={id} />
                  <button
                    type="submit"
                    className="h-10 px-5 bg-copper text-bone font-mono text-[10px] uppercase"
                  >
                    Approve Selection
                  </button>
                </form>
              )}
            </li>
          );
        })}
        {!items?.length && (
          <p className="text-ink/50 italic py-8 text-center border border-dashed border-ink/20">
            No selections posted yet.
          </p>
        )}
      </ul>
    </div>
  );
}
