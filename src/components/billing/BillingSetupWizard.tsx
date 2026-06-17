import Link from "next/link";
import {
  seedDrawSchedule,
  setupHabitat608DrawSchedule,
  updateContractValue,
} from "@/lib/actions/billing";
import {
  formatMoney,
  getDrawTemplateForProject,
  isHabitat608Project,
} from "@/lib/billing/constants";
import type { BillingSetupStep } from "@/lib/billing/summary";

type BillingSetupWizardProps = {
  projectId: string;
  projectSlug: string;
  projectTitle: string;
  step: BillingSetupStep;
  contractValue: number;
  drawCount: number;
  clientId: string | null;
  clientName: string | null;
  stripeReady: boolean;
};

export function BillingSetupWizard({
  projectId,
  projectSlug,
  projectTitle,
  step,
  contractValue,
  drawCount,
  clientId,
  clientName,
  stripeReady,
}: BillingSetupWizardProps) {
  const isHabitat = isHabitat608Project(projectSlug);
  const template = getDrawTemplateForProject(projectSlug);

  return (
    <>
      {step !== "done" && (
        <div className="hub-panel p-6 md:p-10 mb-10 border-copper/20">
          <p className="font-sans text-[10px] tracking-[0.28em] uppercase text-copper mb-2">
            Client billing — 2 steps
          </p>
          <h3 className="font-display text-2xl text-ink leading-snug">
            Set up invoices for {projectTitle}
          </h3>
          <p className="mt-3 text-sm text-ink/60 max-w-2xl leading-relaxed">
            This is what <strong className="text-ink">Habitat or the homeowner pays you</strong> — not
            what it costs you to build. Our cost plan lives on the Cost Plan page.
          </p>

          <ol className="mt-8 space-y-6">
            <li
              className={`flex gap-4 md:gap-6 p-5 border ${
                step === 1 ? "border-copper/40 bg-copper/[0.03]" : "border-ink/10 bg-paper/50"
              }`}
            >
              <StepBadge n={1} done={contractValue > 0} active={step === 1} />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-ink">Enter what the client pays you</h4>
                <p className="mt-1 text-sm text-ink/55 leading-relaxed">
                  The amount on your agreement with Habitat Augusta or the homeowner.
                </p>
                {step === 1 && (
                  <form action={updateContractValue} className="mt-5 flex flex-wrap items-end gap-3">
                    <input type="hidden" name="project_id" value={projectId} />
                    <input type="hidden" name="auto_seed_draws" value="off" />
                    <div>
                      <label className="field-label">Client contract amount ($)</label>
                      <input
                        type="number"
                        name="contract_value"
                        step="1"
                        min="1"
                        placeholder="150000"
                        className="field-input w-40"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="h-11 px-5 bg-ink text-bone font-mono text-[10px] tracking-[0.18em] uppercase hover:bg-copper transition-colors"
                    >
                      Save amount
                    </button>
                  </form>
                )}
                {contractValue > 0 && step !== 1 && (
                  <p className="mt-2 text-sm text-emerald-700 font-medium">
                    ✓ Client pays {formatMoney(contractValue)}
                  </p>
                )}
              </div>
            </li>

            <li
              className={`flex gap-4 md:gap-6 p-5 border ${
                step === 2 ? "border-copper/40 bg-copper/[0.03]" : "border-ink/10 bg-paper/50"
              }`}
            >
              <StepBadge n={2} done={drawCount > 0} active={step === 2} />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-ink">Create the payment schedule</h4>
                <p className="mt-1 text-sm text-ink/55 leading-relaxed">
                  {template.length} invoices tied to build phases. Bill when each phase is done.
                </p>
                {step === 2 && (
                  <>
                    <ul className="mt-4 space-y-2 text-sm">
                      {template.map((d) => (
                        <li
                          key={d.draw_number}
                          className="flex justify-between gap-4 py-2 border-b border-ink/8 last:border-0"
                        >
                          <span className="text-ink/80">
                            <span className="font-mono text-xs text-stone-300 mr-2">
                              {d.draw_number}
                            </span>
                            {d.title}
                          </span>
                          <span className="font-mono text-ink/70 shrink-0">{d.percent}%</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 flex flex-wrap gap-3">
                      {isHabitat && (
                        <form action={setupHabitat608DrawSchedule}>
                          <input type="hidden" name="project_id" value={projectId} />
                          <button
                            type="submit"
                            className="h-11 px-6 bg-copper text-bone font-mono text-[10px] tracking-[0.18em] uppercase"
                          >
                            Use Habitat 5-payment schedule
                          </button>
                        </form>
                      )}
                      <form action={seedDrawSchedule}>
                        <input type="hidden" name="project_id" value={projectId} />
                        <button
                          type="submit"
                          className="h-11 px-6 border border-ink/25 font-mono text-[10px] tracking-[0.18em] uppercase"
                        >
                          Create {template.length}-payment schedule
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            </li>
          </ol>
        </div>
      )}

      {step === "done" && !clientId && (
        <div className="hub-panel border-ink/10 p-5 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-ink/60 leading-relaxed max-w-lg">
            <strong className="text-ink">Link Habitat Augusta</strong> in Job Details so they can see
            progress and messages. You can still mark invoices paid when checks arrive.
          </div>
          <Link
            href={`/admin/projects/${projectId}/overview`}
            className="shrink-0 h-10 px-5 border border-ink/20 font-mono text-[10px] uppercase hover:bg-ink hover:text-bone"
          >
            Job Details →
          </Link>
        </div>
      )}

      {step === "done" && clientId && (
        <div className="hub-panel border-emerald-200/60 bg-emerald-50/50 p-4 mb-8 text-sm text-emerald-900">
          Invoices and updates go to <strong>{clientName}</strong>
          {stripeReady ? " — they can pay by card in the portal." : " — card pay needs Stripe in Vercel."}
        </div>
      )}
    </>
  );
}

function StepBadge({
  n,
  done,
  active,
}: {
  n: number;
  done: boolean;
  active: boolean;
}) {
  return (
    <div
      className={`shrink-0 w-10 h-10 flex items-center justify-center font-mono text-sm border ${
        done
          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
          : active
            ? "bg-copper text-bone border-copper"
            : "bg-paper border-ink/15 text-stone-300"
      }`}
      aria-hidden
    >
      {done ? "✓" : n}
    </div>
  );
}
