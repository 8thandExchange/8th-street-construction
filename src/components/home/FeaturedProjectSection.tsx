import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
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
    <div className="relative aspect-[4/3] border border-ink/10 bg-parchment/40 flex flex-col items-center justify-center p-8 text-center">
      <span className="font-mono text-xs text-gold">—</span>
      <p className="mt-4 font-display text-lg text-ink/70 leading-snug">{label}</p>
      <p className="mt-2 font-sans text-[10px] tracking-[0.18em] uppercase text-pencil/70">{sublabel}</p>
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
        <Reveal className="mb-10 md:mb-14">
          <span className="font-sans text-[11px] tracking-[0.28em] uppercase text-gold">
            {FEATURED_PROJECT.eyebrow}
          </span>
          <h2 className="mt-4 font-display text-display-xl sm:text-display-2xl text-parchment leading-[0.95]">
            {FEATURED_PROJECT.title}
          </h2>
          <p className="mt-5 text-base sm:text-lg text-parchment/70 max-w-xl leading-relaxed">
            {FEATURED_PROJECT.description}
          </p>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          <Reveal delay={80} className="lg:col-span-7">
            <div className="relative aspect-[4/5] sm:aspect-[3/4] overflow-hidden border border-parchment/15 bg-navy-100">
              <Image
                src={FEATURED_PROJECT.rendering}
                alt={FEATURED_PROJECT.renderingAlt}
                fill
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="object-cover object-center"
                priority={false}
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-parchment/10 pointer-events-none" />
              <p className="absolute bottom-5 left-5 font-sans text-[9px] tracking-[0.28em] uppercase text-parchment/50">
                Heritage Rendering · {FEATURED_PROJECT.location}
              </p>
            </div>
          </Reveal>

          <div className="lg:col-span-5 flex flex-col gap-8">
            <Reveal delay={120}>
              <div className="border-t border-parchment/15 pt-6">
                <h3 className="font-sans text-[11px] tracking-[0.28em] uppercase text-gold mb-4">
                  Project Overview
                </h3>
                <p className="text-sm sm:text-base text-parchment/75 leading-relaxed">
                  {FEATURED_PROJECT.overview}
                </p>
                <p className="mt-4 font-sans text-[10px] tracking-[0.2em] uppercase text-parchment/45">
                  {FEATURED_PROJECT.status} · Augusta, Georgia
                </p>
              </div>
            </Reveal>

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

            <Reveal delay={260} className="flex flex-col sm:flex-row gap-3 mt-auto pt-2">
              <Link
                href={`/projects/${FEATURED_PROJECT.slug}`}
                className="inline-flex h-14 items-center justify-center px-8 bg-rust text-parchment hover:bg-rust-200 font-sans text-[11px] tracking-[0.22em] uppercase transition-colors duration-500"
              >
                Follow the Build
              </Link>
              <Link
                href={`/projects/${FEATURED_PROJECT.slug}`}
                className="inline-flex h-14 items-center justify-center px-8 border border-parchment/25 hover:border-parchment hover:bg-parchment hover:text-ink font-sans text-[11px] tracking-[0.22em] uppercase transition-all duration-500"
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
