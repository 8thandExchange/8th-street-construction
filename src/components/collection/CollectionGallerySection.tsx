import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { CollectionGallery } from "./CollectionGallery";
import type { CollectionPageData } from "@/lib/collection-pages";

type CollectionGallerySectionProps = {
  home: Pick<CollectionPageData, "id" | "name">;
};

export function CollectionGallerySection({ home }: CollectionGallerySectionProps) {
  return (
    <section className="relative bg-warm-white section-pad">
      <Container size="wide">
        <Reveal className="mb-8 md:mb-10">
          <span className="eyebrow-copper">Gallery</span>
          <h2 className="mt-4 font-display text-display-md sm:text-display-lg text-ink leading-[1.05]">
            From rendering to residence.
          </h2>
        </Reveal>

        <Reveal delay={80}>
          <CollectionGallery variant={home.id} homeName={home.name} />
        </Reveal>
      </Container>
    </section>
  );
}
