import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { BrandTexture } from "@/components/site/BrandTexture";
import {
  HOME_HERO_POSTER,
  HOME_HERO_POSTER_ALT,
  HOME_HERO_VIDEO,
} from "@/lib/home-hero";
import { ContourLines } from "./ContourLines";
import { HeroVideoBackground } from "./HeroVideoBackground";

export function HeroSection() {
  return (
    <section id="home" className="relative bg-navy text-parchment overflow-hidden min-h-[100svh]">
      <HeroVideoBackground
        src={HOME_HERO_VIDEO}
        poster={HOME_HERO_POSTER}
        posterAlt={HOME_HERO_POSTER_ALT}
      />

      {/* Scrim — readable copy over video; lighter on the right so motion shows through */}
      <div className="absolute inset-0 bg-gradient-to-r from-navy/92 via-navy/65 to-navy/25 md:from-navy/88 md:via-navy/55 md:to-navy/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-navy/30" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-navy via-navy/85 to-transparent pointer-events-none" />

      <BrandTexture kind="linen" opacity={0.1} />
      <ContourLines className="text-parchment" opacity={0.05} />

      <Container
        size="wide"
        className="relative z-10 flex min-h-[100svh] flex-col justify-center pt-[calc(5rem+env(safe-area-inset-top))] md:pt-[calc(6.5rem+env(safe-area-inset-top))] lg:pt-[calc(7rem+env(safe-area-inset-top))] pb-12 md:pb-16 lg:pb-20"
      >
        <div className="max-w-2xl">
          <Reveal direction="left">
            <p className="font-sans text-[10px] sm:text-[11px] tracking-[0.42em] uppercase text-parchment/50">
              8TH STREET CONSTRUCTION
            </p>
          </Reveal>

          <Reveal delay={90} direction="left">
            <h1 className="mt-4 sm:mt-6 font-display text-[clamp(2.25rem,9vw,5rem)] lg:text-display-2xl text-parchment leading-[0.92]">
              Building What Endures.
            </h1>
          </Reveal>

          <Reveal delay={160} direction="left">
            <p className="mt-3 sm:mt-4 font-display text-[clamp(1.25rem,4.5vw,2rem)] italic-display text-gold leading-tight">
              Crafted for Generations.
            </p>
          </Reveal>

          <Reveal delay={240} direction="left" className="mt-6 sm:mt-8 md:mt-10">
            <p className="text-[15px] sm:text-lg text-parchment/75 leading-relaxed max-w-md">
              Custom homes inspired by the architecture, character, and heritage of Augusta, Georgia.
            </p>
          </Reveal>

          <Reveal delay={340} direction="left" className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3">
            <Link
              href="#featured-project"
              className="cta-lift inline-flex h-12 sm:h-14 items-center justify-center px-6 sm:px-8 bg-rust text-parchment hover:bg-rust-200 font-sans text-[10px] sm:text-[11px] tracking-[0.2em] sm:tracking-[0.22em] uppercase"
            >
              Explore The Oaks
            </Link>
            <Link
              href="#collection"
              className="cta-lift inline-flex h-12 sm:h-14 items-center justify-center px-6 sm:px-8 border border-parchment/25 hover:border-parchment hover:bg-parchment hover:text-ink font-sans text-[10px] sm:text-[11px] tracking-[0.2em] sm:tracking-[0.22em] uppercase"
            >
              View The Collection
            </Link>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
