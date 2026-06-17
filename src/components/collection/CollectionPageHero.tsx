import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { RenderingFrame, getRenderingAspect } from "@/components/ui/RenderingFrame";
import { BrandTexture } from "@/components/site/BrandTexture";
import { ContourLines } from "@/components/home/ContourLines";
import type { CollectionPageData } from "@/lib/collection-pages";
import { getCollectionImage, getCollectionImageAlt } from "@/lib/collection-images";

type CollectionPageHeroProps = {
  home: CollectionPageData;
};

export function CollectionPageHero({ home }: CollectionPageHeroProps) {
  return (
    <section className="relative bg-navy text-parchment overflow-hidden lg:min-h-[85svh]">
      <BrandTexture kind="linen" opacity={0.1} />
      <ContourLines className="text-parchment" opacity={0.05} />

      <Container
        size="wide"
        className="relative grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 lg:gap-16 lg:min-h-[85svh] pt-[calc(5rem+env(safe-area-inset-top))] md:pt-[calc(6.5rem+env(safe-area-inset-top))] lg:pt-[calc(7rem+env(safe-area-inset-top))] pb-8 md:pb-12 lg:pb-16"
      >
        <Reveal delay={60} className="order-1 lg:order-2">
          <RenderingFrame
            src={getCollectionImage(home.id)}
            alt={getCollectionImageAlt(home.name)}
            aspect={getRenderingAspect(home.id)}
            priority
            variant="dark"
            label="Heritage Rendering · The Collection"
            sizes="(min-width: 1024px) 46vw, 100vw"
          />
        </Reveal>

        <div className="order-2 lg:order-1 flex flex-col justify-center">
          <Reveal>
            <Link
              href="/#collection"
              className="font-sans text-[10px] tracking-[0.28em] uppercase text-parchment/45 hover:text-gold transition-colors duration-300"
            >
              ← The Collection
            </Link>
          </Reveal>

          <Reveal delay={60}>
            <h1 className="mt-4 sm:mt-6 font-display text-[clamp(2rem,8vw,4.5rem)] lg:text-display-2xl text-parchment leading-[0.95]">
              {home.name}
            </h1>
          </Reveal>

          <Reveal delay={120}>
            <p className="mt-4 sm:mt-6 text-[15px] sm:text-lg md:text-xl text-parchment/75 leading-relaxed max-w-lg">
              {home.statement}
            </p>
          </Reveal>

          <Reveal delay={180} className="mt-6 sm:mt-8">
            <p className="font-sans text-[10px] tracking-[0.22em] uppercase text-gold/80">{home.detail}</p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
