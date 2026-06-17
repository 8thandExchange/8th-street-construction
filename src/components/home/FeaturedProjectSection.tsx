import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { RenderingFrame } from "@/components/ui/RenderingFrame";
import { BrandTexture } from "@/components/site/BrandTexture";
import { FEATURED_PROJECT } from "@/lib/featured-project";
import { ContourLines } from "./ContourLines";

function PlaceholderPanel({
  label,
  sublabel,
}: {
  label: string;
  sublabel: string;
}) {
  return (
    <div className="relative min-h-[7.5rem] sm:min-h-[9rem] border border-parchment/15 bg-navy-100/50 flex flex-col items-center justify-center p-5 sm:p-6 text-center">
      <span className="font-mono text-xs text-gold">—</span>
      <p className="mt-3 font-display text-base sm:text-lg text-parchment/75 leading-snug max-w-xs">
        {label}
      </p>
      <p className="mt-2 font-sans text-[9px] sm:text-[10px] tracking-[0.18em] uppercase text-parchment/40">
        {sublabel}
      </p>
    </div>
  );
}

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
          <p className="mt-4 text-[15px] sm:text-lg text-parchment/70 max-w-xl leading-relaxed">
            {FEATURED_PROJECT.description}
          </p>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 lg:gap-10">
          <Reveal delay={80} className="lg:col-span-7">
            <RenderingFrame
              src={FEATURED_PROJECT.rendering}
              alt={FEATURED_PROJECT.renderingAlt}
              aspect="5/4"
              variant="dark"
              label={`Heritage Rendering · ${FEATURED_PROJECT.location}`}
              sizes="(min-width: 1024px) 58vw, 100vw"
            />
          </Reveal>

          <div className="lg:col-span-5 flex flex-col gap-5 md:gap-6">
            <Reveal delay={120}>
              <div className="border-t border-parchment/15 pt-5 sm:pt-6">
                <h3 className="font-sans text-[11px] tracking-[0.28em] uppercase text-gold mb-3 sm:mb-4">
                  Project Overview
                </h3>
                <p className="text-sm sm:text-base text-parchment/75 leading-relaxed">
                  {FEATURED_PROJECT.overview}
                </p>
                <p className="mt-3 sm:mt-4 font-sans text-[10px] tracking-[0.2em] uppercase text-parchment/45">
                  {FEATURED_PROJECT.status} · Augusta, Georgia
                </p>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <Reveal delay={180}>
                <PlaceholderPanel
                  label="Progress photography begins at next milestone."
                  sublabel="Construction Archive"
                />
              </Reveal>
              <Reveal delay={220}>
                <PlaceholderPanel
                  label="Completed residence gallery upon delivery."
                  sublabel="Future Gallery"
                />
              </Reveal>
            </div>

            <Reveal delay={260} className="flex flex-col sm:flex-row gap-3 pt-1">
              <Link
                href={`/projects/${FEATURED_PROJECT.slug}`}
                className="inline-flex h-12 sm:h-14 items-center justify-center px-6 sm:px-8 bg-rust text-parchment hover:bg-rust-200 font-sans text-[10px] sm:text-[11px] tracking-[0.22em] uppercase transition-colors duration-500"
              >
                Follow the Build
              </Link>
              <Link
                href={`/projects/${FEATURED_PROJECT.slug}`}
                className="inline-flex h-12 sm:h-14 items-center justify-center px-6 sm:px-8 border border-parchment/25 hover:border-parchment hover:bg-parchment hover:text-ink font-sans text-[10px] sm:text-[11px] tracking-[0.22em] uppercase transition-all duration-500"
              >
                View Project
              </Link>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
