import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { BrandTexture } from "@/components/site/BrandTexture";
import { getCollectionHomes } from "@/lib/collection-pages";
import { CollectionCard } from "./CollectionCard";
import { ContourLines } from "./ContourLines";

export function CollectionSection() {
  return (
    <section id="collection" className="relative bg-parchment section-pad overflow-hidden">
      <BrandTexture kind="linen" opacity={0.18} />
      <ContourLines className="text-ink" opacity={0.04} />

      <Container size="wide" className="relative">
        <Reveal className="max-w-2xl mb-12 md:mb-16">
          <span className="eyebrow-copper">The 8th Street Collection</span>
          <h2 className="mt-4 font-display text-display-xl text-ink leading-[1.02]">
            Inspired Homes. Timeless Design.
          </h2>
          <p className="mt-5 text-base sm:text-lg text-ink/70 leading-relaxed">
            A collection of thoughtfully designed homes created for modern Southern living.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {getCollectionHomes().map((home, i) => (
            <CollectionCard key={home.id} home={home} index={i} />
          ))}
        </div>
      </Container>
    </section>
  );
}
