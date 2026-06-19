import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { BrandTexture } from "@/components/site/BrandTexture";
import { MACON_608_COPY, MACON_608_MEDIA } from "@/lib/projects/macon-608-content";

export function Macon608ProjectPage() {
  const copy = MACON_608_COPY;

  return (
    <>
      <SiteHeader dark />
      <main className="bg-bone text-ink">
        {/* Hero — motion video behind headline */}
        <section className="relative min-h-[88vh] md:min-h-[92vh] bg-navy overflow-hidden">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster={MACON_608_MEDIA.heroPoster}
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src={MACON_608_MEDIA.heroVideo} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/55 to-navy/25" />
          <BrandTexture kind="linen" opacity={0.08} className="text-parchment" />

          <Container
            size="wide"
            className="relative z-10 flex min-h-[88vh] md:min-h-[92vh] flex-col justify-end pb-14 md:pb-20 pt-[calc(6rem+env(safe-area-inset-top))]"
          >
            <Reveal>
              <p className="font-sans text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-gold">
                {copy.eyebrow}
              </p>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="mt-4 font-display text-[clamp(2.5rem,9vw,5.5rem)] text-parchment leading-[0.92] max-w-4xl">
                {copy.title}
              </h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="mt-5 max-w-2xl text-lg md:text-xl text-parchment/85 leading-relaxed">
                {copy.subhead}
              </p>
            </Reveal>
            <Reveal delay={260}>
              <p className="mt-4 font-sans text-[10px] tracking-[0.22em] uppercase text-parchment/55">
                {copy.statusLine}
              </p>
            </Reveal>
          </Container>
        </section>

        {/* The Story — twilight still */}
        <section className="relative bg-parchment section-pad overflow-hidden">
          <BrandTexture kind="linen" opacity={0.12} />
          <Container size="wide" className="relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
              <Reveal className="lg:col-span-5 order-2 lg:order-1">
                <span className="eyebrow-copper">{copy.story.label}</span>
                <h2 className="mt-4 font-display text-display-md md:text-display-lg text-ink leading-[1.02]">
                  {copy.story.heading}
                </h2>
                <div className="mt-8 space-y-6">
                  {copy.story.paragraphs.map((paragraph, i) => (
                    <p
                      key={i}
                      className={
                        i === 0
                          ? "text-lg md:text-xl text-ink leading-relaxed"
                          : "text-base md:text-lg text-ink/80 leading-[1.75]"
                      }
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </Reveal>
              <Reveal delay={120} className="lg:col-span-7 order-1 lg:order-2">
                <div className="relative aspect-[4/3] md:aspect-[16/11] overflow-hidden bg-bone">
                  <Image
                    src={MACON_608_MEDIA.twilight}
                    alt="608 Macon Avenue at twilight — architectural rendering"
                    fill
                    priority
                    sizes="(min-width: 1024px) 58vw, 100vw"
                    className="object-cover brand-photo"
                  />
                </div>
              </Reveal>
            </div>
          </Container>
        </section>

        {/* What We're Building — street angle + specs */}
        <section className="relative bg-bone section-pad border-t border-ink/10">
          <Container size="wide">
            <Reveal className="mb-10 md:mb-14">
              <span className="eyebrow-copper">{copy.building.label}</span>
              <p className="mt-6 max-w-3xl text-lg md:text-xl text-ink/85 leading-relaxed">
                {copy.building.intro}
              </p>
            </Reveal>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
              <Reveal delay={80} className="lg:col-span-7">
                <div className="relative aspect-[16/10] overflow-hidden bg-paper">
                  <Image
                    src={MACON_608_MEDIA.streetAngle}
                    alt="608 Macon Avenue — three-quarter street view rendering"
                    fill
                    sizes="(min-width: 1024px) 58vw, 100vw"
                    className="object-cover brand-photo"
                  />
                </div>
              </Reveal>
              <Reveal delay={140} className="lg:col-span-5">
                <dl className="grid grid-cols-1 gap-px bg-ink/10 border border-ink/10">
                  {copy.building.specs.map((spec) => (
                    <div key={spec.label} className="bg-warm-white px-6 py-5 md:px-8 md:py-6">
                      <dt className="font-sans text-[10px] tracking-[0.22em] uppercase text-pencil">
                        {spec.label}
                      </dt>
                      <dd className="mt-2 font-display text-xl text-ink leading-snug">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            </div>
          </Container>
        </section>

        {/* The Build, Documented — real photos only, placeholders for now */}
        <section className="relative bg-paper section-pad border-t border-ink/10">
          <Container size="wide">
            <Reveal>
              <span className="eyebrow-copper">{copy.timeline.label}</span>
              <p className="mt-6 max-w-2xl text-base md:text-lg text-ink/75 leading-relaxed">
                {copy.timeline.intro}
              </p>
            </Reveal>

            <ol className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {copy.timeline.milestones.map((milestone, i) => (
                <Reveal key={milestone.title} delay={(i % 3) * 80}>
                  <li className="border border-ink/12 bg-bone p-6 md:p-8 h-full flex flex-col">
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-stone-300">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-3 font-display text-2xl text-ink">{milestone.title}</h3>
                    <div className="mt-5 flex-1 aspect-[4/3] border border-dashed border-ink/20 bg-warm-white/60 flex items-center justify-center">
                      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-stone-300 text-center px-4">
                        {milestone.note}
                      </span>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </Container>
        </section>

        {/* Part of the Work — Habitat + porch detail */}
        <section className="relative bg-parchment section-pad border-t border-ink/10 overflow-hidden">
          <BrandTexture kind="blueprint" opacity={0.06} />
          <Container size="wide" className="relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
              <Reveal className="lg:col-span-5">
                <span className="eyebrow-copper">{copy.partnership.label}</span>
                <p className="mt-6 text-base md:text-lg text-ink/85 leading-[1.75]">
                  {copy.partnership.body}
                </p>
              </Reveal>
              <Reveal delay={120} className="lg:col-span-7">
                <div className="relative aspect-[3/4] max-w-md mx-auto lg:max-w-none lg:ml-auto overflow-hidden bg-bone">
                  <Image
                    src={MACON_608_MEDIA.porchDetail}
                    alt="608 Macon Avenue — front porch and entry detail rendering"
                    fill
                    sizes="(min-width: 1024px) 40vw, 80vw"
                    className="object-cover brand-photo"
                  />
                </div>
              </Reveal>
            </div>
          </Container>
        </section>

        {/* CTA */}
        <section className="bg-navy text-parchment section-pad border-t border-ink/10">
          <Container size="wide">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
              <Reveal className="lg:col-span-7">
                <h2 className="font-display text-display-md md:text-display-lg leading-[1.02]">
                  {copy.cta.heading}
                </h2>
                <p className="mt-6 max-w-2xl text-base md:text-lg text-parchment/75 leading-relaxed">
                  {copy.cta.body}
                </p>
              </Reveal>
              <Reveal delay={120} className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col gap-3">
                <Link
                  href="/book"
                  className="inline-flex h-14 items-center justify-center px-8 bg-rust text-parchment hover:bg-rust-200 font-sans text-[10px] sm:text-[11px] tracking-[0.22em] uppercase transition-colors duration-500"
                >
                  Book a Consultation
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex h-14 items-center justify-center px-8 border border-parchment/30 hover:border-parchment hover:bg-parchment hover:text-ink font-sans text-[10px] sm:text-[11px] tracking-[0.22em] uppercase transition-all duration-500"
                >
                  Send an Inquiry
                </Link>
              </Reveal>
            </div>
          </Container>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
