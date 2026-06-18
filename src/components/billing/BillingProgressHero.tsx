import Image from "next/image";
import { formatMoney } from "@/lib/billing/constants";
import type { BillingSummary } from "@/lib/billing/summary";
import { ProgressRing } from "@/components/hub/HubUI";

type BillingProgressHeroProps = {
  projectTitle: string;
  summary: BillingSummary;
};

export function BillingProgressHero({ projectTitle, summary }: BillingProgressHeroProps) {
  if (summary.revisedContract <= 0) return null;

  return (
    <section className="relative overflow-hidden border border-ink/10 bg-gradient-to-br from-ink via-ink to-[#2a241c] text-bone mb-12">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, #c9a66b 0%, transparent 45%), radial-gradient(circle at 80% 80%, #f5f0e8 0%, transparent 40%)",
        }}
        aria-hidden
      />
      <div className="relative px-6 md:px-8 py-8 md:py-10">
        <Image
          src="/img/logo-horizontal-navy.svg"
          alt="8th Street Construction"
          width={200}
          height={48}
          className="h-9 w-auto mb-8"
        />
        <div className="grid md:grid-cols-[auto_1fr] gap-8 items-center">
          <ProgressRing pct={summary.paidPct} size={120} label="Collected" tone="light" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-copper-300/90">
              Payment progress
            </p>
            <h3 className="mt-2 font-display text-2xl md:text-3xl leading-tight">{projectTitle}</h3>
            <div className="mt-6 grid grid-cols-3 gap-4 max-w-lg">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-bone/50">Job total</p>
                <p className="mt-1 font-display text-xl">{formatMoney(summary.revisedContract)}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-bone/50">Paid</p>
                <p className="mt-1 font-display text-xl text-emerald-300">{formatMoney(summary.paid)}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-bone/50">Balance</p>
                <p className="mt-1 font-display text-xl">{formatMoney(summary.balance)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
