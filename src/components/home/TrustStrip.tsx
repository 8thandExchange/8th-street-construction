import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { getSiteContact } from "@/lib/site-contact";

function servingLine(areas: string[]) {
  if (areas.length === 1) return `Serving ${areas[0]}`;
  return `Serving ${areas.slice(0, -1).join(", ")} & ${areas[areas.length - 1]}`;
}

/** Quiet, factual trust strip — no badges, no noise. */
export async function TrustStrip() {
  const contact = await getSiteContact();
  const FACTS = [
    "Licensed & insured — Georgia and South Carolina",
    "Habitat for Humanity partner builds",
    servingLine(contact.serviceArea),
    "A division of 8th and Exchange Capital",
  ];
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
