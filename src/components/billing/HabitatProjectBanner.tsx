import Link from "next/link";
import { formatMoney, HABITAT_608_MACON } from "@/lib/billing/constants";
import { MACON_608_ESTIMATE_META } from "@/lib/estimate/divisions";

export function HabitatProjectBanner({ projectId }: { projectId: string }) {
  return (
    <div className="hub-panel border-copper/25 bg-copper/[0.04] p-5 md:p-6 mb-8">
      <div className="flex flex-wrap justify-between gap-4">
        <div className="max-w-xl">
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-copper">
            Habitat for Humanity Augusta
          </p>
          <p className="mt-2 text-sm text-ink/70 leading-relaxed">
            608 Macon Ave — {HABITAT_608_MACON.heatedSquareFeet.toLocaleString()} heated SF.
            Use the <strong className="text-ink">Cost Plan</strong> for what we think it costs to build.
            Use <strong className="text-ink">Client Invoices</strong> for what Habitat pays us.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-mono uppercase text-stone-300">Permit-set cost plan starts at</p>
          <p className="font-display text-2xl text-ink mt-1">
            {formatMoney(MACON_608_ESTIMATE_META.directCostTotal)}
          </p>
          <Link
            href={`/admin/projects/${projectId}/costs`}
            className="inline-block mt-2 font-mono text-[10px] uppercase text-copper hover:underline"
          >
            Open cost plan →
          </Link>
        </div>
      </div>
    </div>
  );
}
