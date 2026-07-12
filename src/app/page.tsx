import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { StockDisclaimer } from "@/components/site/StockDisclaimer";
import { MarqueeMarker } from "@/components/site/MarqueeMarker";
import { Reveal } from "@/components/ui/Reveal";

const IMG = "/img/projects";

const CAPABILITIES = [
  {
    title: "Custom Homes",
    image: `${IMG}/home-cottage-spanish-moss-porch.jpg`,
    description:
      "Lowcountry-rooted custom homes built to weather generations. From cottage to estate.",
  },
  {
    title: "Historic Restoration",
    image: `${IMG}/home-white-historic-wrap-porch.jpg`,
    description:
      "Restoring Augusta's architectural heritage with patient craft and modern systems.",
  },
  {
    title: "Modern Renovations",
    image: `${IMG}/interior-modern-white-kitchen.jpg`,
    description:
      "Kitchen and whole-home renovations that respect the bones and elevate the living.",
  },
  {
    title: "Community Building",
    image: `${IMG}/build-women-wall-framing.jpg`,
    description:
      "Habitat for Humanity partnerships and community-focused builds — the same standard, broader reach.",
  },
];

const PRINCIPLES = [
  {
    n: "01",
    title: "Owner-involved",
    body: "Every project is touched by ownership — not delegated to a sales rep after the contract is signed.",
  },
  {
    n: "02",
    title: "Selective by choice",
    body: "We take fewer projects so each receives the attention the work deserves.",
  },
  {
    n: "03",
    title: "Built to outlast",
    body: "Materials and methods that respect the timeline beyond your tenure.",
  },
  {
    n: "04",
    title: "Locally rooted",
    body: "The CSRA is home. We know the soil, the codes, the trades, the inspectors.",
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-navy text-bone">
        <section className="bg-navy grain-overlay pt-14 md:pt-24 pb-8 md:pb-14">
          <div className="px-4 md:px-10">
            <div className="hero-photo-frame relative aspect-[16/9] w-full overflow-hidden">
              <Image
                src={`${IMG}/home-charleston-double-porch-sc-flag.jpg`}
                alt="Charleston double-porch residence with oak canopy and South Carolina flag"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 92vw"
                className="hero-photo-image object-cover animate-ken-burns"
              />
            </div>
          </div>

          <div className="mx-auto max-w-8xl px-6 md:px-10 lg:px-14 mt-10 md:mt-14 grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16 items-end">
            <div className="lg:col-span-2">
              <h1 className="font-display text-[clamp(2.5rem,5.5vw,5.5rem)] leading-[0.95] tracking-tight text-parchment">
                A builder&apos;s standard for an{" "}
                <span className="italic text-copper">owner&apos;s</span> home.
              </h1>
            </div>
            <aside className="editorial-sidebar lg:col-span-1">
              <div className="editorial-sidebar-item">
                <p className="editorial-sidebar-label">Location</p>
                <p className="editorial-sidebar-value">Augusta, Georgia</p>
              </div>
              <div className="editorial-sidebar-item">
                <p className="editorial-sidebar-label">Established</p>
                <p className="editorial-sidebar-value">2023</p>
              </div>
            </aside>
          </div>

          <p className="mt-8 md:mt-10 text-center font-mono text-[14px] tracking-[0.25em] uppercase text-slate-warm">
            <span className="text-copper text-base">·</span> Residential{" "}
            <span className="text-copper text-base mx-2">·</span> Commercial{" "}
            <span className="text-copper text-base mx-2">·</span> Restoration{" "}
            <span className="text-copper text-base mx-2">·</span> Design-Build
          </p>
        </section>

        <section className="relative bg-navy pt-20 md:pt-28 pb-32 md:pb-48 grain-overlay border-t border-bone/5">
          <div className="mx-auto max-w-5xl px-6 text-center">
            <div className="h-px w-full max-w-xs mx-auto bg-copper/40 mb-12 md:mb-16" />
            <Reveal>
              <p className="font-display text-[clamp(2rem,5.5vw,4.5rem)] leading-[1.05]">
                We build the way the work deserves.
              </p>
            </Reveal>
            <div className="h-px w-full max-w-xs mx-auto bg-copper/40 mt-12 md:mt-16" />
          </div>
        </section>

        <section className="bg-navy-deep py-20 md:py-28 grain-overlay">
          <div className="mx-auto max-w-8xl px-6 md:px-10 lg:px-14">
            <Reveal className="mb-14 md:mb-16">
              <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-copper mb-4">What we build</p>
              <h2 className="font-display text-[clamp(2rem,4vw,3rem)] max-w-2xl">
                The work we take on — and the standard we hold to.
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
              {CAPABILITIES.map((item) => (
                <article key={item.title} className="group">
                  <div className="relative aspect-[4/3] overflow-hidden bg-navy mb-6">
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.04]"
                    />
                  </div>
                  <h3 className="font-display text-[clamp(1.5rem,2.5vw,1.875rem)] text-bone copper-rule-hover inline-block">
                    {item.title}
                  </h3>
                  <p className="mt-3 body-premium text-bone/65 max-w-md">{item.description}</p>
                </article>
              ))}
            </div>

            <p className="stock-disclaimer text-center mt-14 md:mt-16 max-w-xl mx-auto">
              Imagery is representative. Project portfolio in progress as we complete our first builds.
            </p>
          </div>
        </section>

        <MarqueeMarker />

        <section className="bg-navy py-24 md:py-32 grain-overlay">
          <div className="mx-auto max-w-8xl px-6 md:px-10 lg:px-14 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <Reveal className="relative aspect-[3/4] max-h-[640px] overflow-hidden">
              <Image
                src={`${IMG}/home-columned-entry-stone-steps.jpg`}
                alt="Columned entry with stone steps"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </Reveal>
            <div>
              <Reveal>
                <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-copper mb-4">How we work</p>
                <h2 className="font-display text-[clamp(2rem,4vw,3rem)] mb-10">The approach</h2>
              </Reveal>
              <ul className="space-y-8 md:space-y-10">
                {PRINCIPLES.map((p, i) => (
                  <Reveal key={p.n} stagger={i} as="li" className="flex gap-6">
                    <span className="font-mono text-[11px] tracking-[0.2em] text-copper shrink-0 pt-1">
                      {p.n}
                    </span>
                    <div>
                      <h3 className="font-sans text-lg font-medium text-bone mb-2">{p.title}</h3>
                      <p className="body-premium text-bone/65">{p.body}</p>
                    </div>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-navy-deep py-20 md:py-28 grain-overlay border-t border-bone/5">
          <div>
            <Reveal className="max-w-3xl mx-auto px-6 md:px-10 text-center mb-12 md:mb-16">
              <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.75rem)] leading-tight">
                Built for everyone, with the <span className="italic text-copper">same</span> care.
              </h2>
            </Reveal>
            <div className="mx-auto max-w-8xl px-6 md:px-10 lg:px-14 relative">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-7 relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={`${IMG}/build-habitat-volunteer-hammering.jpg`}
                    alt="Volunteers building with Habitat for Humanity"
                    fill
                    sizes="(max-width: 768px) 100vw, 58vw"
                    className="object-cover"
                  />
                </div>
                <div className="md:col-span-5 md:-mt-16 relative aspect-[3/4] overflow-hidden z-10 shadow-2xl shadow-black/40">
                  <Image
                    src={`${IMG}/build-women-wall-framing.jpg`}
                    alt="Framing crew on a community build"
                    fill
                    sizes="(max-width: 768px) 100vw, 42vw"
                    className="object-cover"
                  />
                </div>
              </div>
              <Reveal className="mt-10 md:mt-12 max-w-2xl">
                <p className="body-premium text-bone/65">
                  Our first projects are with Habitat for Humanity — community homes built with the same
                  standard we apply to every project. We believe the way you build for one client should be
                  the way you build for all.
                </p>
                <Link
                  href="/volunteer"
                  className="mt-8 inline-flex items-center gap-3 font-mono text-[11px] tracking-[0.22em] uppercase text-copper hover:text-copper-glow transition-colors"
                >
                  See upcoming volunteer build days
                  <span aria-hidden>→</span>
                </Link>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="bg-navy py-28 md:py-40 grain-overlay">
          <Reveal className="mx-auto max-w-4xl px-6 text-center">
            <blockquote className="font-display text-[clamp(1.5rem,3.5vw,2.5rem)] leading-[1.35] text-bone/90">
              &ldquo;There is a way to build that respects the land, the trades, the budget, and the people who
              will live inside what you build. That standard is non-negotiable.&rdquo;
            </blockquote>
            <p className="mt-10 font-mono text-[11px] tracking-[0.22em] uppercase text-copper">
              — The 8th Street Standard
            </p>
          </Reveal>
        </section>

        <section className="bg-navy-deep py-28 md:py-36 grain-overlay border-t border-copper/20">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <Reveal>
              <h2 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-tight mb-6">
                Begin a conversation.
              </h2>
              <p className="body-premium text-bone/65 mb-10">
                We&apos;re early in our story and selective by choice. If you&apos;re considering a build,
                restoration, or major renovation in the CSRA, we&apos;d be glad to discuss it — even if
                we&apos;re not the right fit.
              </p>
              <Link href="/book" className="btn-copper-fill w-full md:w-[280px] mx-auto">
                <span>Book a Consultation →</span>
              </Link>
              <p className="mt-6 font-mono text-[11px] tracking-[0.2em] uppercase text-slate-warm">
                Reply within one business day. Always.
              </p>
            </Reveal>
          </div>
        </section>

        <div className="bg-navy py-10 border-t border-bone/10">
          <StockDisclaimer />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
