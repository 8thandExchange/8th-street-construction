import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import type { CollectionHighlight } from "@/lib/collection-pages";

type ArchitecturalHighlightsProps = {
  highlights: CollectionHighlight[];
};

export function ArchitecturalHighlights({ highlights }: ArchitecturalHighlightsProps) {
  return (
    <section className="relative bg-warm-white section-pad border-y border-ink/8">
      <Container size="wide">
        <Reveal className="max-w-xl mb-12 md:mb-16">
          <span className="eyebrow-copper">Architectural Highlights</span>
          <h2 className="mt-4 font-display text-display-md sm:text-display-lg text-ink leading-[1.05]">
            Composed details that define the residence.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {highlights.map((item, i) => (
            <Reveal key={item.title} delay={i * 60}>
              <article className="border-t border-ink/12 pt-6 md:pt-8 h-full group">
                <span className="font-mono text-xs text-gold">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-4 font-display text-xl sm:text-2xl text-ink group-hover:text-rust transition-colors duration-500">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm text-ink/65 leading-relaxed">{item.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
