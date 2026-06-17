import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { HERITAGE_PILLARS } from "@/lib/home-collection";
import { ContourLines } from "./ContourLines";

const DELIVERABLES = [
  "Custom architectural portrait",
  "Construction archive",
  "Homeowner presentation piece",
  "Project story",
] as const;

export function HeritageRenderingSection() {
  return (
    <section className="relative bg-warm-white section-pad border-y border-ink/8 overflow-hidden">
      <ContourLines className="text-navy" opacity={0.05} />

      <Container size="wide" className="relative">
        <Reveal className="max-w-3xl mb-14 md:mb-20">
          <h2 className="font-display text-display-xl text-ink leading-[1.02]">
            Every Home Becomes Part of the Collection
          </h2>
          <p className="mt-6 text-base sm:text-lg text-ink/70 leading-relaxed max-w-2xl">
            The Heritage Rendering system documents each residence as an architectural portrait — a permanent record of design intent, field craft, and the story of how it came to be.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 lg:gap-16 mb-16 md:mb-20">
          {HERITAGE_PILLARS.map((pillar, i) => (
            <Reveal key={pillar.title} delay={i * 80}>
              <div className="border-t border-ink/12 pt-6 md:pt-8 h-full">
                <h3 className="font-sans text-[11px] tracking-[0.28em] uppercase text-rust">
                  {pillar.title}
                </h3>
                <p className="mt-4 text-sm sm:text-[15px] text-ink/70 leading-relaxed">{pillar.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200}>
          <div className="surface-card rounded-sm p-8 md:p-12 lg:p-14">
            <p className="font-sans text-[11px] tracking-[0.28em] uppercase text-pencil mb-6">
              Each completed home receives
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {DELIVERABLES.map((item, i) => (
                <li key={item} className="flex gap-4 items-start">
                  <span className="font-mono text-sm text-gold shrink-0">0{i + 1}</span>
                  <span className="font-display text-lg sm:text-xl text-ink leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
