import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { ContourLines } from "@/components/home/ContourLines";
import type { CollectionPageData } from "@/lib/collection-pages";

type CollectionAvailabilityProps = {
  home: Pick<CollectionPageData, "name" | "availability">;
};

export function CollectionAvailability({ home }: CollectionAvailabilityProps) {
  return (
    <section className="relative bg-navy text-parchment section-pad overflow-hidden grain-overlay">
      <ContourLines className="text-parchment" opacity={0.05} />

      <Container size="wide" className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-7">
            <Reveal>
              <span className="font-sans text-[11px] tracking-[0.28em] uppercase text-gold">Availability</span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-5 font-display text-display-lg sm:text-display-xl text-parchment leading-[1.02]">
                {home.availability.headline}
              </h2>
            </Reveal>
            <Reveal delay={140} className="mt-6">
              <p className="text-base sm:text-lg text-parchment/70 leading-relaxed max-w-xl">
                {home.availability.body}
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-5">
            <Reveal delay={180}>
              <div className="surface-card-dark rounded-sm p-8 md:p-10 text-center lg:text-left">
                <p className="font-display text-2xl sm:text-3xl text-parchment leading-snug">
                  Commission {home.name}
                </p>
                <p className="mt-4 text-sm text-parchment/60 leading-relaxed">
                  Begin with a conversation about your site, program, and timeline. We respond within one business day.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row lg:flex-col gap-3">
                  <Link
                    href="/book"
                    className="inline-flex h-14 items-center justify-center px-8 bg-rust text-parchment hover:bg-rust-200 font-sans text-[11px] tracking-[0.22em] uppercase transition-colors duration-500"
                  >
                    Start Your Project
                  </Link>
                  <Link
                    href="/#contact"
                    className="inline-flex h-14 items-center justify-center px-8 border border-parchment/25 hover:border-parchment hover:bg-parchment hover:text-ink font-sans text-[11px] tracking-[0.22em] uppercase transition-all duration-500"
                  >
                    Send an Inquiry
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
