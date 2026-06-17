import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { BrandTexture } from "@/components/site/BrandTexture";
import { ContourLines } from "@/components/home/ContourLines";
import type { CollectionPageData } from "@/lib/collection-pages";
import { getCollectionImage, getCollectionImageAlt } from "@/lib/collection-images";

type CollectionPageHeroProps = {
  home: CollectionPageData;
};

export function CollectionPageHero({ home }: CollectionPageHeroProps) {
  return (
    <section className="relative min-h-[85svh] lg:min-h-[90svh] bg-navy text-parchment overflow-hidden">
      <BrandTexture kind="linen" opacity={0.1} />
      <ContourLines className="text-parchment" opacity={0.05} />

      <Container
        size="wide"
        className="relative grid min-h-[85svh] lg:min-h-[90svh] grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 pt-[calc(5.5rem+env(safe-area-inset-top))] md:pt-[calc(7rem+env(safe-area-inset-top))] pb-12 md:pb-16"
      >
        <div className="flex flex-col justify-center order-2 lg:order-1">
          <Reveal>
            <Link
              href="/#collection"
              className="font-sans text-[10px] tracking-[0.28em] uppercase text-parchment/45 hover:text-gold transition-colors duration-300"
            >
              ← The Collection
            </Link>
          </Reveal>

          <Reveal delay={60}>
            <h1 className="mt-6 font-display text-display-xl lg:text-display-2xl text-parchment leading-[0.95]">
              {home.name}
            </h1>
          </Reveal>

          <Reveal delay={120}>
            <p className="mt-6 text-base sm:text-lg md:text-xl text-parchment/75 leading-relaxed max-w-lg">
              {home.statement}
            </p>
          </Reveal>

          <Reveal delay={180} className="mt-8">
            <p className="font-sans text-[10px] tracking-[0.22em] uppercase text-gold/80">{home.detail}</p>
          </Reveal>
        </div>

        <Reveal delay={80} className="flex items-center justify-center order-1 lg:order-2">
          <div className="relative w-full max-w-xl lg:max-w-none aspect-[4/5] luxury-frame border border-parchment/15 overflow-hidden min-h-[320px] sm:min-h-[400px] lg:min-h-[480px]">
            <Image
              src={getCollectionImage(home.id)}
              alt={getCollectionImageAlt(home.name)}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/25 via-transparent to-transparent pointer-events-none" />
            <p className="absolute bottom-5 left-5 font-sans text-[9px] tracking-[0.28em] uppercase text-parchment/55">
              Heritage Rendering · The Collection
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
