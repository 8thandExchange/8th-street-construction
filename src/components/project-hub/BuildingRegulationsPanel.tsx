import type { JurisdictionRegulations } from "@/lib/building-regulations/types";

export function BuildingRegulationsPanel({
  regulations,
  compact = false,
}: {
  regulations: JurisdictionRegulations;
  compact?: boolean;
}) {
  return (
    <div className={`bg-paper border border-ink/15 ${compact ? "p-5" : "p-8"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <span className="eyebrow">Local Building Regulations</span>
          <h3 className="mt-2 font-display text-xl text-ink">{regulations.name}</h3>
          <p className="text-sm text-ink/60 mt-1">{regulations.ahj}</p>
        </div>
        {regulations.portalUrl && (
          <a
            href={regulations.portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] tracking-[0.15em] uppercase text-copper hover:underline shrink-0"
          >
            AHJ Portal →
          </a>
        )}
      </div>

      {(regulations.contactPhone || regulations.contactAddress) && (
        <div className="text-xs font-mono text-stone-300 mb-6 space-y-1">
          {regulations.contactAddress && <div>{regulations.contactAddress}</div>}
          {regulations.contactPhone && <div>{regulations.contactPhone}</div>}
        </div>
      )}

      <div className={`grid gap-6 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
        <RegulationList title="Adopted Codes" items={regulations.adoptedCodes} />
        <RegulationList title="Permit Thresholds" items={regulations.permitThresholds} />
        <RegulationList title="Plan Review Package" items={regulations.planReviewRequirements} />
        <RegulationList title="Typical Inspection Sequence" items={regulations.inspectionSequence} />
      </div>

      {regulations.sections.map((section) => (
        <div key={section.title} className="mt-6 pt-6 border-t border-ink/10">
          <h4 className="font-mono text-[10px] tracking-[0.18em] uppercase text-stone-300 mb-3">
            {section.title}
          </h4>
          <ul className="space-y-2 text-sm text-ink/75">
            {section.items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-copper shrink-0">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function RegulationList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="font-mono text-[10px] tracking-[0.18em] uppercase text-stone-300 mb-3">
        {title}
      </h4>
      <ul className="space-y-2 text-sm text-ink/75">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-copper shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
