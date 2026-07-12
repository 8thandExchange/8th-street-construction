import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { StockDisclaimer } from "@/components/site/StockDisclaimer";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — A Builder's Standard | Augusta, GA",
  description:
    "8th Street Construction is a residential and commercial builder in Augusta, GA. A division of 8th and Exchange Capital, we bring institutional planning to local construction.",
  alternates: { canonical: "/about" },
};

const VALUES = [
  {
    n: "01",
    title: "Owner-Involved",
    body: "Every project is touched by ownership — not by a sales rep who hands you off after the contract is signed. Decisions get made by the people who'll stand behind them.",
  },
  {
    n: "02",
    title: "Selective by Choice",
    body: "We take on projects we believe we can do exceptionally. Not the most projects. Not the biggest. The right ones, where we can give the attention each deserves.",
  },
  {
    n: "03",
    title: "Built to Outlast",
    body: "Structures should outlive their owners. We build with materials and methods that respect that — and we'll tell you when a cheaper approach would be a worse decision.",
  },
  {
    n: "04",
    title: "Locally Rooted",
    body: "Augusta is home. The CSRA is our market. We know the soil conditions, the permitting offices, the suppliers, and the trades — grounded in local relationships with suppliers, trades, and permitting offices.",
  },
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-bone text-ink">
        <section className="pt-40 pb-16 md:pt-52 md:pb-32">
          <Container size="wide">
            <Reveal>
              <span className="section-num">— Studio</span>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="mt-6 font-display text-display-2xl leading-[0.95] max-w-5xl">
                A builder's<br/>
                standard. <span className="italic-display text-copper">A client's</span><br/>
                trust.
              </h1>
            </Reveal>
          </Container>
        </section>

        {/* The story */}
        <section className="bg-bone py-20 md:py-32 rule-top">
          <Container size="wide">
            <div className="grid grid-cols-12 gap-6 lg:gap-12">
              <div className="col-span-12 lg:col-span-3">
                <Reveal>
                  <span className="section-num">01 — The work</span>
                </Reveal>
              </div>
              <div className="col-span-12 lg:col-span-9 lg:max-w-3xl">
                <Reveal>
                  <p className="font-display text-2xl md:text-3xl leading-relaxed text-ink mb-8">
                    8th Street Construction is the construction arm of 8th and Exchange Capital — bringing institutional discipline to residential and commercial building in the Augusta market.
                  </p>
                </Reveal>
                <Reveal delay={150}>
                  <p className="text-lg leading-relaxed text-ink/75">
                    The Augusta market deserves a builder who treats every project — regardless of scale — with the same planning, transparency, and accountability that institutional investors demand from their construction partners. That's what we built 8th Street Construction to be.
                  </p>
                </Reveal>
                <Reveal delay={250}>
                  <p className="mt-6 text-lg leading-relaxed text-ink/75">
                    We exist in the gap between national construction firms who treat Augusta as a satellite market and small operators who can't bring institutional rigor to bear. We bring both: local knowledge with institutional discipline.
                  </p>
                </Reveal>
              </div>
            </div>
          </Container>
        </section>

        {/* Values */}
        <section className="bg-paper py-20 md:py-32 rule-top">
          <Container size="wide">
            <Reveal className="mb-16">
              <span className="section-num">02 — How we operate</span>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-ink/15">
              {VALUES.map((v, i) => (
                <Reveal key={v.n} delay={i * 100} className="bg-paper">
                  <div className="p-8 md:p-12 bg-paper h-full">
                    <div className="font-mono text-sm tracking-[0.15em] text-copper mb-8">{v.n}</div>
                    <h3 className="font-display text-3xl text-ink mb-4">{v.title}</h3>
                    <p className="text-base text-ink/70 leading-relaxed">{v.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* Parent org */}
        <section className="bg-navy text-bone py-20 md:py-32 grain-overlay">
          <Container size="wide">
            <div className="grid grid-cols-12 gap-6 lg:gap-12">
              <div className="col-span-12 lg:col-span-3">
                <Reveal>
                  <span className="font-mono text-[13px] tracking-[0.15em] text-copper-100">
                    03 — Parent org
                  </span>
                </Reveal>
              </div>
              <div className="col-span-12 lg:col-span-9 lg:max-w-2xl">
                <Reveal>
                  <h2 className="font-display text-display-md text-bone mb-8 leading-[1.05]">
                    A division of <span className="italic-display text-copper-100">8th &amp; Exchange Capital.</span>
                  </h2>
                </Reveal>
                <Reveal delay={150}>
                  <p className="text-lg text-bone/75 leading-relaxed">
                    8th Street Construction operates as a division of 8th and Exchange Capital, an Augusta-based holding company building businesses with long horizons and disciplined operations.
                  </p>
                </Reveal>
                <Reveal delay={250}>
                  <p className="mt-6 text-lg text-bone/75 leading-relaxed">
                    That parentage means we're capitalized for the long term and structured for accountability — we don't disappear after the project closes, and we don't cut corners to make a quarter.
                  </p>
                </Reveal>
              </div>
            </div>
          </Container>
        </section>

        {/* CTA */}
        <section className="bg-bone py-20 md:py-32">
          <Container size="wide">
            <div className="grid grid-cols-12 gap-6 items-end">
              <div className="col-span-12 md:col-span-7">
                <Reveal>
                  <h2 className="font-display text-display-xl leading-[0.95]">
                    Let's build<br/>
                    <span className="italic-display text-copper">something.</span>
                  </h2>
                </Reveal>
              </div>
              <div className="col-span-12 md:col-span-5 flex flex-col gap-3 justify-end">
                <Reveal delay={150}>
                  <Link
                    href="/book"
                    className="inline-flex w-full h-14 items-center justify-center bg-ink text-bone hover:bg-copper font-mono text-xs tracking-[0.2em] uppercase transition-colors duration-500"
                  >
                    Book a Consultation
                  </Link>
                </Reveal>
                <Reveal delay={250}>
                  <Link
                    href="/contact"
                    className="inline-flex w-full h-14 items-center justify-center border border-ink/30 hover:border-ink hover:bg-ink hover:text-bone font-mono text-xs tracking-[0.2em] uppercase transition-all duration-500"
                  >
                    Send an Inquiry
                  </Link>
                </Reveal>
              </div>
            </div>
          </Container>
        </section>
      </main>

        <div className="py-10 border-t border-ink/10 bg-inherit">
          <StockDisclaimer />
        </div>

      <SiteFooter />
    </>
  );
}
