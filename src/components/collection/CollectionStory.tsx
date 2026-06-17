import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { BrandTexture } from "@/components/site/BrandTexture";

type CollectionStoryProps = {
  story: string[];
};

export function CollectionStory({ story }: CollectionStoryProps) {
  return (
    <section className="relative bg-parchment section-pad overflow-hidden">
      <BrandTexture kind="linen" opacity={0.14} />

      <Container size="narrow" className="relative">
        <Reveal>
          <span className="eyebrow-copper">The Story</span>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 md:mt-10 space-y-6">
            {story.map((paragraph, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? "text-xl sm:text-2xl font-display text-ink leading-snug max-w-prose"
                    : "text-base sm:text-lg text-ink/80 leading-[1.75] max-w-prose"
                }
              >
                {paragraph}
              </p>
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
