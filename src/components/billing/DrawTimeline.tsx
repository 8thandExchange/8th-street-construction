import { createInvoiceFromDraw } from "@/lib/actions/billing";
import { formatMoney } from "@/lib/billing/constants";
import type { DrawRecord } from "@/lib/billing/summary";
import { DRAW_STATUS_LABELS, DRAW_STATUS_STYLES } from "@/lib/project/labels";

type DrawTimelineProps = {
  projectId: string;
  draws: DrawRecord[];
};

export function DrawTimeline({ projectId, draws }: DrawTimelineProps) {
  if (!draws.length) return null;

  return (
    <section className="mb-12">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h3 className="font-display text-xl text-ink">Payment schedule</h3>
          <p className="mt-1 text-sm text-ink/55">
            Bill each row when that phase of the build is complete.
          </p>
        </div>
      </div>

      <ol className="space-y-0 border border-ink/10 bg-paper">
        {draws.map((d, i) => {
          const isLast = i === draws.length - 1;
          const statusLabel = DRAW_STATUS_LABELS[d.status] ?? d.status;
          const statusStyle = DRAW_STATUS_STYLES[d.status] ?? DRAW_STATUS_STYLES.scheduled;

          return (
            <li
              key={d.id}
              className={`relative pl-12 pr-6 py-6 ${!isLast ? "border-b border-ink/8" : ""}`}
            >
              {/* Timeline dot */}
              <div
                className={`absolute left-5 top-7 w-3 h-3 rounded-full border-2 ${
                  d.status === "paid"
                    ? "bg-emerald-500 border-emerald-500"
                    : d.status === "invoiced"
                      ? "bg-amber-400 border-amber-400"
                      : "bg-paper border-stone-300"
                }`}
                aria-hidden
              />
              {!isLast && (
                <div
                  className="absolute left-[1.35rem] top-10 bottom-0 w-px bg-ink/10"
                  aria-hidden
                />
              )}

              <div className="flex flex-wrap justify-between gap-4">
                <div className="max-w-lg">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs text-stone-300">
                      Payment {d.draw_number}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border ${statusStyle}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <h4 className="mt-2 font-medium text-ink text-lg">{d.title}</h4>
                  {d.description && (
                    <p className="mt-1.5 text-sm text-ink/55 leading-relaxed">{d.description}</p>
                  )}
                  {d.scheduled_date && (
                    <p className="mt-2 text-xs font-mono text-stone-300">
                      Target date: {d.scheduled_date}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className="font-display text-2xl text-ink">
                    {formatMoney(Number(d.amount))}
                  </div>
                  {d.percent_of_contract != null && (
                    <div className="text-xs font-mono text-stone-300 mt-1">
                      {d.percent_of_contract}% of contract
                    </div>
                  )}
                  {d.status === "scheduled" && (
                    <form
                      action={async (fd) => {
                        "use server";
                        await createInvoiceFromDraw(fd);
                      }}
                      className="mt-4"
                    >
                      <input type="hidden" name="project_id" value={projectId} />
                      <input type="hidden" name="draw_id" value={d.id} />
                      <button
                        type="submit"
                        className="h-10 px-5 bg-copper text-bone font-mono text-[10px] tracking-[0.16em] uppercase hover:bg-copper-400 transition-colors"
                      >
                        Send invoice
                      </button>
                    </form>
                  )}
                  {d.status === "invoiced" && (
                    <p className="mt-4 text-xs text-amber-800 max-w-[10rem] ml-auto leading-relaxed">
                      Waiting on payment — mark paid below when check clears.
                    </p>
                  )}
                  {d.status === "paid" && (
                    <p className="mt-4 text-xs text-emerald-700 font-medium">✓ Paid</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
