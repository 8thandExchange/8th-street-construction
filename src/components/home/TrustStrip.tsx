import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

const FACTS = [
  "Licensed & insured — Georgia and South Carolina",
  "Habitat for Humanity partner builds",
  "Serving Augusta, Evans, Martinez, Grovetown, North Augusta & Aiken",
  "A division of 8th and Exchange Capital",
] as const;

/** Quiet, factual trust strip — no badges, no noise. */
export function TrustStrip() {
  return (
    <section className="border-y border-ink/10 bg-bone-50 py-8">
      <Container size="wide">
        <Reveal>
          <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {FACTS.map((fact) => (
              <li
                key={fact}
                className="text-[11px] font-sans uppercase tracking-[0.16em] text-ink/55"
              >
                {fact}
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}
