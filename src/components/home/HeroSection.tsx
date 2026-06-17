import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { BrandTexture } from "@/components/site/BrandTexture";
import { FEATURED_PROJECT } from "@/lib/featured-project";
import { ContourLines } from "./ContourLines";

export function HeroSection() {
  return (
    <section id="home" className="relative min-h-[100svh] bg-navy text-parchment overflow-hidden">
      <BrandTexture kind="linen" opacity={0.12} />
      <ContourLines className="text-parchment" opacity={0.06} />

      <Container
        size="wide"
        className="relative grid min-h-[100svh] grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 pt-[calc(5.5rem+env(safe-area-inset-top))] md:pt-[calc(7rem+env(safe-area-inset-top))] pb-12 md:pb-16"
      >
        <div className="flex flex-col justify-center max-w-xl lg:max-w-none">
          <Reveal>
            <p className="font-sans text-[10px] sm:text-[11px] tracking-[0.42em] uppercase text-parchment/50">
              8TH STREET CONSTRUCTION
            </p>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-6 font-display text-display-2xl text-parchment leading-[0.92]">
              Building What Endures.
            </h1>
          </Reveal>

          <Reveal delay={140}>
            <p className="mt-4 font-display text-display-md italic-display text-gold leading-tight">
              Crafted for Generations.
            </p>
          </Reveal>

          <Reveal delay={200} className="mt-8 md:mt-10">
            <p className="text-base sm:text-lg text-parchment/75 leading-relaxed max-w-md">
              Custom homes inspired by the architecture, character, and heritage of Augusta, Georgia.
            </p>
          </Reveal>

          <Reveal delay={280} className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link
              href="#featured-project"
              className="inline-flex h-14 items-center justify-center px-8 bg-rust text-parchment hover:bg-rust-200 font-sans text-[11px] tracking-[0.22em] uppercase transition-colors duration-500"
            >
              Explore 608 Macon Avenue
            </Link>
            <Link
              href="#collection"
              className="inline-flex h-14 items-center justify-center px-8 border border-parchment/25 hover:border-parchment hover:bg-parchment hover:text-ink font-sans text-[11px] tracking-[0.22em] uppercase transition-all duration-500"
            >
              View The Collection
            </Link>
          </Reveal>

          <Reveal delay={360} className="mt-14 hidden lg:flex items-center gap-4 border-t border-parchment/10 pt-6">
            <span className="block w-10 h-px bg-gold/60 animate-subtle-pulse" aria-hidden />
            <span className="font-sans text-[10px] tracking-[0.22em] uppercase text-parchment/40">
              Scroll to explore
            </span>
          </Reveal>
        </div>

        <Reveal delay={120} className="flex items-center justify-center lg:justify-end">
          <div className="relative w-full max-w-lg lg:max-w-none aspect-[4/5] luxury-frame border border-parchment/15 overflow-hidden">
            <Image
              src={FEATURED_PROJECT.rendering}
              alt={FEATURED_PROJECT.renderingAlt}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/30 via-transparent to-transparent pointer-events-none" />
            <p className="absolute bottom-5 left-5 font-sans text-[9px] tracking-[0.28em] uppercase text-parchment/60">
              Flagship Project · {FEATURED_PROJECT.title}
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
