import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { RenderingFrame } from "@/components/ui/RenderingFrame";
import { BrandTexture } from "@/components/site/BrandTexture";
import { FEATURED_PROJECT } from "@/lib/featured-project";
import { FEATURED_RENDERING_DIMENSIONS } from "@/lib/collection-images";
import { ContourLines } from "./ContourLines";

export function FeaturedProjectSection() {
  return (
    <section
      id="featured-project"
      className="relative bg-navy text-parchment section-pad overflow-hidden grain-overlay"
    >
      <BrandTexture kind="blueprint" opacity={0.18} />
      <ContourLines className="text-parchment" opacity={0.05} />

      <Container size="wide" className="relative">
        <Reveal className="mb-8 md:mb-12">
          <span className="font-sans text-[11px] tracking-[0.28em] uppercase text-gold">
            {FEATURED_PROJECT.eyebrow}
          </span>
          <h2 className="mt-3 sm:mt-4 font-display text-[clamp(2rem,7vw,4.5rem)] text-parchment leading-[0.95]">
            {FEATURED_PROJECT.title}
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 lg:gap-10 items-start">
          <Reveal delay={80} className="lg:col-span-7">
            <RenderingFrame
              src={FEATURED_PROJECT.rendering}
              alt={FEATURED_PROJECT.renderingAlt}
              dimensions={FEATURED_RENDERING_DIMENSIONS}
              variant="dark"
              label={`Heritage Rendering · ${FEATURED_PROJECT.location}`}
              sizes="(min-width: 1024px) 58vw, 100vw"
            />
          </Reveal>

          <div className="lg:col-span-5 flex flex-col gap-6 md:gap-8">
            <Reveal delay={120}>
              <p className="text-sm sm:text-base text-parchment/75 leading-relaxed">
                {FEATURED_PROJECT.description}
              </p>
              <p className="mt-4 text-sm sm:text-base text-parchment/65 leading-relaxed">
                {FEATURED_PROJECT.overview}
              </p>
              <p className="mt-5 font-sans text-[10px] tracking-[0.2em] uppercase text-parchment/45">
                {FEATURED_PROJECT.status} · Augusta, Georgia
              </p>
            </Reveal>

            <Reveal delay={180} className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/projects/${FEATURED_PROJECT.slug}`}
                className="inline-flex h-12 sm:h-14 items-center justify-center px-6 sm:px-8 bg-rust text-parchment hover:bg-rust-200 font-sans text-[10px] sm:text-[11px] tracking-[0.22em] uppercase transition-colors duration-500"
              >
                View Project
              </Link>
              <Link
                href="/book"
                className="inline-flex h-12 sm:h-14 items-center justify-center px-6 sm:px-8 border border-parchment/25 hover:border-parchment hover:bg-parchment hover:text-ink font-sans text-[10px] sm:text-[11px] tracking-[0.22em] uppercase transition-all duration-500"
              >
                Start a Conversation
              </Link>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
