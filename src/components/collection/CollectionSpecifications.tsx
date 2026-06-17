import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import type { CollectionSpecs } from "@/lib/collection-pages";

type CollectionSpecificationsProps = {
  specs: CollectionSpecs;
};

const SPEC_ROWS: { key: keyof CollectionSpecs; label: string }[] = [
  { key: "squareFeet", label: "Square Footage" },
  { key: "bedrooms", label: "Bedrooms" },
  { key: "bathrooms", label: "Bathrooms" },
  { key: "garage", label: "Garage" },
  { key: "outdoorLiving", label: "Outdoor Living" },
];

export function CollectionSpecifications({ specs }: CollectionSpecificationsProps) {
  return (
    <section className="relative bg-parchment section-pad border-t border-ink/8">
      <Container size="wide">
        <Reveal className="mb-10 md:mb-14">
          <span className="eyebrow-copper">Specifications</span>
          <h2 className="mt-4 font-display text-display-md sm:text-display-lg text-ink leading-[1.05]">
            Program ranges for commission.
          </h2>
          <p className="mt-4 text-sm text-ink/55 max-w-lg">
            Ranges reflect typical adaptations. Final specifications are defined during design development.
          </p>
        </Reveal>

        <Reveal delay={80}>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-ink/10 border border-ink/10">
            {SPEC_ROWS.map((row) => (
              <div key={row.key} className="bg-warm-white p-6 md:p-8">
                <dt className="font-sans text-[10px] tracking-[0.22em] uppercase text-pencil">{row.label}</dt>
                <dd className="mt-3 font-display text-lg sm:text-xl text-ink leading-snug">{specs[row.key]}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </Container>
    </section>
  );
}
