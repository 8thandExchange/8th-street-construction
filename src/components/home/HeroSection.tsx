import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { RenderingFrame } from "@/components/ui/RenderingFrame";
import { BrandTexture } from "@/components/site/BrandTexture";
import { FEATURED_RENDERING_DIMENSIONS } from "@/lib/collection-images";
import { FEATURED_PROJECT } from "@/lib/featured-project";
import { ContourLines } from "./ContourLines";

export function HeroSection() {
  return (
    <section id="home" className="relative bg-navy text-parchment overflow-hidden lg:min-h-[100svh]">
      <BrandTexture kind="linen" opacity={0.12} />
      <ContourLines className="text-parchment" opacity={0.06} />

      <Container
        size="wide"
        className="relative grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 lg:gap-16 lg:min-h-[100svh] pt-[calc(5rem+env(safe-area-inset-top))] md:pt-[calc(6.5rem+env(safe-area-inset-top))] lg:pt-[calc(7rem+env(safe-area-inset-top))] pb-8 md:pb-12 lg:pb-16"
      >
        {/* Mobile: rendering first for immediate visual impact */}
        <Reveal delay={60} className="order-1 lg:order-2 flex items-stretch lg:items-center lg:justify-end">
          <RenderingFrame
            src={FEATURED_PROJECT.rendering}
            alt={FEATURED_PROJECT.renderingAlt}
            dimensions={FEATURED_RENDERING_DIMENSIONS}
            priority
            variant="dark"
            label={`Flagship Project · ${FEATURED_PROJECT.title}`}
            sizes="(min-width: 1024px) 46vw, 100vw"
          />
        </Reveal>

        <div className="order-2 lg:order-1 flex flex-col justify-center max-w-xl lg:max-w-none">
          <Reveal>
            <p className="font-sans text-[10px] sm:text-[11px] tracking-[0.42em] uppercase text-parchment/50">
              8TH STREET CONSTRUCTION
            </p>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-4 sm:mt-6 font-display text-[clamp(2.25rem,9vw,5rem)] lg:text-display-2xl text-parchment leading-[0.92]">
              Building What Endures.
            </h1>
          </Reveal>

          <Reveal delay={140}>
            <p className="mt-3 sm:mt-4 font-display text-[clamp(1.25rem,4.5vw,2rem)] italic-display text-gold leading-tight">
              Crafted for Generations.
            </p>
          </Reveal>

          <Reveal delay={200} className="mt-6 sm:mt-8 md:mt-10">
            <p className="text-[15px] sm:text-lg text-parchment/75 leading-relaxed max-w-md">
              Custom homes inspired by the architecture, character, and heritage of Augusta, Georgia.
            </p>
          </Reveal>

          <Reveal delay={280} className="mt-8 sm:mt-10 flex flex-col gap-3">
            <Link
              href="#featured-project"
              className="inline-flex h-12 sm:h-14 items-center justify-center px-6 sm:px-8 bg-rust text-parchment hover:bg-rust-200 font-sans text-[10px] sm:text-[11px] tracking-[0.2em] sm:tracking-[0.22em] uppercase transition-colors duration-500"
            >
              Explore 608 Macon Avenue
            </Link>
            <Link
              href="#collection"
              className="inline-flex h-12 sm:h-14 items-center justify-center px-6 sm:px-8 border border-parchment/25 hover:border-parchment hover:bg-parchment hover:text-ink font-sans text-[10px] sm:text-[11px] tracking-[0.2em] sm:tracking-[0.22em] uppercase transition-all duration-500"
            >
              View The Collection
            </Link>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
