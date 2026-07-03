import { createInvoiceFromDraw } from "@/lib/actions/billing";
import { formatMoney } from "@/lib/billing/constants";
import type { DrawRecord } from "@/lib/billing/summary";
import { DRAW_STATUS_LABELS, DRAW_STATUS_STYLES } from "@/lib/project/labels";

type DrawTimelineProps = {
  projectId: string;
  draws: DrawRecord[];
};

function dotClass(status: string) {
  if (status === "paid") return "bg-emerald-500 border-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]";
  if (status === "invoiced") return "bg-amber-400 border-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.15)]";
  return "bg-paper border-stone-300";
}

export function DrawTimeline({ projectId, draws }: DrawTimelineProps) {
  if (!draws.length) return null;

  const paidCount = draws.filter((d) => d.status === "paid").length;

  return (
    <section className="mb-12">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h3 className="font-display text-xl md:text-2xl text-ink">Payment schedule</h3>
          <p className="mt-1 text-sm text-ink/55">
            Bill each milestone when that phase of the build is complete.
          </p>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
          {paidCount} of {draws.length} collected
        </p>
      </div>

      <ol className="relative border border-ink/10 bg-paper overflow-hidden">
        {draws.map((d, i) => {
          const isLast = i === draws.length - 1;
          const statusLabel = DRAW_STATUS_LABELS[d.status] ?? d.status;
          const statusStyle = DRAW_STATUS_STYLES[d.status] ?? DRAW_STATUS_STYLES.scheduled;

          return (
            <li
              key={d.id}
              className={`relative pl-14 md:pl-16 pr-6 py-6 md:py-7 ${
                !isLast ? "border-b border-ink/8" : ""
              } ${d.status === "paid" ? "bg-emerald-50/30" : ""}`}
            >
              <div
                className={`absolute left-6 md:left-7 top-8 w-3.5 h-3.5 rounded-full border-2 ${dotClass(d.status)}`}
                aria-hidden
              />
              {!isLast && (
                <div
                  className="absolute left-[1.65rem] md:left-[1.9rem] top-11 bottom-0 w-px bg-ink/10"
                  aria-hidden
                />
              )}

              <div className="flex flex-wrap justify-between gap-5">
                <div className="max-w-xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs text-stone-400">
                      Draw {d.draw_number}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border ${statusStyle}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <h4 className="mt-2 font-display text-lg md:text-xl text-ink">{d.title}</h4>
                  {d.description && (
                    <p className="mt-1.5 text-sm text-ink/55 leading-relaxed">{d.description}</p>
                  )}
                  {d.scheduled_date && (
                    <p className="mt-2 text-xs font-mono text-stone-400">
                      Target · {d.scheduled_date}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className="font-display text-2xl md:text-3xl text-ink">
                    {formatMoney(Number(d.amount))}
                  </div>
                  {d.percent_of_contract != null && (
                    <div className="text-xs font-mono text-stone-400 mt-1">
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
                        className="app-btn app-btn-accent"
                      >
                        Send invoice
                      </button>
                    </form>
                  )}
                  {d.status === "invoiced" && (
                    <p className="mt-4 text-xs text-amber-800 max-w-[11rem] ml-auto leading-relaxed">
                      Invoice sent — awaiting payment
                    </p>
                  )}
                  {d.status === "paid" && (
                    <p className="mt-4 text-xs text-emerald-700 font-medium">✓ Collected</p>
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
