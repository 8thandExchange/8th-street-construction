import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { Container } from "@/components/ui/Container";
import { createClient } from "@/lib/supabase/server";
import { SITE_IMAGES } from "@/lib/site-images";
import Link from "next/link";
import Image from "next/image";
import { BrandTexture } from "@/components/site/BrandTexture";
import { LogoIntro } from "@/components/brand/LogoIntro";
import { HeroArchitecture } from "@/components/site/HeroArchitecture";
import { StatCounter } from "@/components/site/StatCounter";

export const revalidate = 3600;

const STATS = [
  { value: "25+", label: "Years Combined Experience" },
  { value: "100%", label: "Owner Involvement" },
  { value: "0", label: "Corners Cut" },
  { value: "1", label: "Standard — Excellence" },
];

const PROCESS = [
  {
    n: "01",
    title: "Discover",
    body: "We listen first. Understanding your vision, constraints, and goals before proposing anything.",
  },
  {
    n: "02",
    title: "Plan",
    body: "Detailed scoping, honest budgeting, and realistic scheduling. Risks identified early — and planned around.",
  },
  {
    n: "03",
    title: "Build",
    body: "Execution with precision. Daily progress, consistent communication, quality checkpoints at every milestone.",
  },
  {
    n: "04",
    title: "Deliver",
    body: "Thorough walkthrough, clean handoff, complete documentation. We stand behind our work long after closeout.",
  },
];

const PRINCIPLES = [
  {
    title: "Craft Over Speed",
    body: "We'd rather build one project right than rush through three. Quality is the only metric when the structure has to last generations.",
  },
  {
    title: "Radical Transparency",
    body: "No hidden costs, no surprise change orders, no communication gaps. You'll always know where your project stands.",
  },
  {
    title: "Total Accountability",
    body: "We stand behind our work. Every detail, every finish, every deadline — we own it all, and we answer directly to you.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();

  const { data: featuredProjects } = await supabase
    .from("projects")
    .select("id, slug, title, subtitle, category, location, year_completed, hero_image_url, excerpt")
    .neq("status", "draft")
    .neq("status", "archived")
    .eq("featured", true)
    .order("display_order", { ascending: true })
    .limit(3);

  const { data: services } = await supabase
    .from("services")
    .select("slug, name, short_description, display_order")
    .eq("published", true)
    .order("display_order", { ascending: true });

  const { data: testimonials } = await supabase
    .from("testimonials")
    .select("id, client_name, client_title, quote, rating")
    .eq("published", true)
    .order("display_order", { ascending: true })
    .limit(3);

  return (
    <>
      <LogoIntro />
      <SiteHeader dark />
      <main className="bg-bone text-ink">
        {/* HERO */}
        <PageHero
          image={SITE_IMAGES.hero}
          imageAlt={SITE_IMAGES.heroAlt}
          className="min-h-[100svh] flex flex-col"
          imagePosition="top"
          texture="blueprint"
        >
          <HeroArchitecture />
          <Container size="wide" className="flex flex-col flex-1 pt-[calc(5.5rem+env(safe-area-inset-top))] md:pt-[calc(7rem+env(safe-area-inset-top))] pb-12 md:pb-20">
            <div className="flex-1 flex flex-col justify-end max-w-5xl">
              <Reveal>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6 md:mb-8">
                  <span className="eyebrow-copper">Augusta · CSRA</span>
                  <span className="hidden sm:inline w-px h-3 bg-bone/25" aria-hidden />
                  <span className="eyebrow text-bone/45">8th &amp; Exchange Capital</span>
                </div>
              </Reveal>

              <Reveal delay={80}>
                <h1 className="font-display text-display-2xl text-bone leading-[0.92] max-w-[14ch]">
                  Building
                  <br />
                  <span className="italic-display text-copper-100">what</span> endures.
                </h1>
              </Reveal>

              <Reveal delay={180} className="mt-8 md:mt-10 max-w-lg">
                <p className="text-base sm:text-lg md:text-xl text-bone/80 leading-relaxed">
                  Custom homes and commercial construction across the CSRA — rooted in Low Country craft, Augusta vernacular, and structures built to endure.
                </p>
              </Reveal>

              <Reveal delay={280} className="mt-8 md:mt-10 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Link
                  href="/book"
                  className="inline-flex h-14 items-center justify-center px-8 bg-copper text-bone hover:bg-copper-400 font-mono text-xs tracking-[0.2em] uppercase transition-colors duration-500"
                >
                  Start a Conversation
                </Link>
                <Link
                  href="/projects"
                  className="inline-flex h-14 items-center justify-center px-8 border border-bone/30 hover:border-bone hover:bg-bone hover:text-ink font-mono text-xs tracking-[0.2em] uppercase transition-all duration-500 backdrop-blur-sm bg-navy/20"
                >
                  Selected Work
                </Link>
              </Reveal>
            </div>

            <div className="mt-12 md:mt-16 flex items-center justify-between border-t border-bone/15 pt-6">
              <div className="font-mono text-[10px] sm:text-[11px] tracking-[0.2em] uppercase text-bone/45 flex items-center gap-3">
                <span className="block w-8 sm:w-12 h-px bg-copper/60 animate-subtle-pulse" />
                Scroll to explore
              </div>
              <div className="font-mono text-[10px] sm:text-[11px] tracking-[0.2em] uppercase text-bone/35 hidden sm:block">
                © {new Date().getFullYear()}
              </div>
            </div>
          </Container>
        </PageHero>

        {/* STATS */}
        <section className="bg-bone section-pad border-b border-ink/10">
          <Container size="wide">
            <Reveal className="mb-8 md:mb-12">
              <span className="eyebrow-copper">By the numbers</span>
            </Reveal>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 md:gap-6">
              {STATS.map((stat, i) => (
                <Reveal key={stat.label} delay={i * 80}>
                  <div className="border-t border-ink/12 pt-5 md:pt-6">
                    <div className="font-display text-display-lg text-ink leading-none">
                      <StatCounter value={stat.value} />
                    </div>
                    <div className="eyebrow mt-3 md:mt-4 text-stone-300 leading-snug pr-2">{stat.label}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ABOUT */}
        <section id="about" className="bg-bone section-pad">
          <Container size="wide">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
              <div className="lg:col-span-5">
                <Reveal>
                  <div className="relative aspect-[4/5] sm:aspect-[5/6] overflow-hidden bg-paper">
                    <Image
                      src={SITE_IMAGES.craft}
                      alt={SITE_IMAGES.craftAlt}
                      fill
                      sizes="(min-width: 1024px) 42vw, 100vw"
                      className="object-cover brand-photo"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy/50 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                      <span className="eyebrow text-bone/70">On every jobsite</span>
                      <p className="mt-2 font-display text-2xl text-bone leading-snug max-w-xs">
                        Precision you can see — and trust for generations.
                      </p>
                    </div>
                  </div>
                </Reveal>
              </div>

              <div className="lg:col-span-7 flex flex-col justify-center">
                <Reveal>
                  <span className="section-num">01 — Who we are</span>
                </Reveal>
                <Reveal delay={100}>
                  <h2 className="mt-5 font-display text-display-xl leading-[1.02] text-ink">
                    A builder&apos;s standard.
                    <br />
                    <span className="italic-display text-copper">A client&apos;s</span> trust.
                  </h2>
                </Reveal>
                <Reveal delay={180} className="mt-6 md:mt-8">
                  <p className="text-base sm:text-lg leading-relaxed text-ink/80 max-w-xl">
                    8th Street Construction brings decades of combined experience to every residential and commercial project in the Augusta market — with institutional-grade planning and genuine personal accountability.
                  </p>
                </Reveal>

                <div className="mt-10 md:mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                  {PRINCIPLES.map((p, i) => (
                    <Reveal key={p.title} delay={220 + i * 80}>
                      <div className="surface-card rounded-sm p-5 md:p-6 h-full">
                        <h3 className="font-display text-xl md:text-2xl text-ink mb-2">{p.title}</h3>
                        <p className="text-sm text-ink/65 leading-relaxed">{p.body}</p>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* SERVICES */}
        <section id="services" className="bg-paper section-pad border-t border-ink/10">
          <Container size="wide">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 md:mb-14">
              <div className="max-w-2xl">
                <Reveal>
                  <span className="section-num">02 — What we build</span>
                </Reveal>
                <Reveal delay={100}>
                  <h2 className="mt-4 font-display text-display-xl leading-[1.02] text-ink">
                    Residential <span className="italic-display">&amp;</span> commercial
                    <br className="hidden sm:block" />
                    construction services.
                  </h2>
                </Reveal>
              </div>
              <Reveal delay={180}>
                <p className="text-base sm:text-lg text-ink/65 leading-relaxed max-w-md md:text-right">
                  Full-service construction — from pre-construction through final walkthrough. One team, one standard.
                </p>
              </Reveal>
            </div>

            {/* Mobile: horizontal rail · Desktop: grid */}
            <div className="scroll-rail md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-px md:bg-ink/10 -mx-5 px-5 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
              {(services ?? []).map((service, i) => (
                <Reveal key={service.slug} delay={i * 60} className="md:bg-paper h-full">
                  <Link
                    href={`/services#${service.slug}`}
                    className="group flex flex-col h-full min-h-[16rem] p-6 md:p-8 lg:p-10 bg-paper md:hover:bg-bone transition-colors duration-500 surface-card md:border-0 md:shadow-none md:rounded-none rounded-sm"
                  >
                    <div className="flex items-baseline justify-between mb-5">
                      <span className="section-num">0{i + 1}</span>
                      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-stone-300 group-hover:text-copper transition-colors">
                        →
                      </span>
                    </div>
                    <h3 className="font-display text-2xl md:text-3xl text-ink mb-3 group-hover:text-copper transition-colors duration-500">
                      {service.name}
                    </h3>
                    <p className="text-sm sm:text-[15px] text-ink/70 leading-relaxed flex-1">
                      {service.short_description}
                    </p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* PROCESS */}
        <section id="approach" className="bg-bone section-pad border-t border-ink/10">
          <Container size="wide">
            <Reveal className="mb-10 md:mb-14 max-w-2xl">
              <span className="section-num">03 — How we work</span>
              <h2 className="mt-4 font-display text-display-xl leading-[1.02] text-ink">
                A disciplined process.
                <br />
                <span className="italic-display text-copper">No surprises.</span>
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-px md:bg-ink/10 relative">
              {PROCESS.map((step, i) => (
                <Reveal key={step.n} delay={i * 80} className="md:bg-bone">
                  <div className="surface-card md:border-0 md:shadow-none md:rounded-none rounded-sm p-6 md:p-8 lg:p-10 h-full bg-bone">
                    <div className="font-mono text-sm tracking-[0.15em] text-copper mb-6">{step.n}</div>
                    <h3 className="font-display text-2xl md:text-3xl text-ink mb-3">{step.title}</h3>
                    <p className="text-sm sm:text-[15px] text-ink/70 leading-relaxed">{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* SELECTED WORK */}
        <section className="bg-navy text-bone section-pad grain-overlay relative overflow-hidden">
          <BrandTexture kind="blueprint" opacity={0.22} />
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <Image
              src={SITE_IMAGES.interior}
              alt=""
              fill
              sizes="100vw"
              className="object-cover brand-photo"
              aria-hidden
            />
            <div className="absolute inset-0 bg-navy/85" />
          </div>

          <Container size="wide" className="relative">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 md:mb-16">
              <Reveal>
                <span className="font-mono text-[13px] tracking-[0.15em] text-copper-100">04 — Selected work</span>
                <h2 className="mt-4 font-display text-display-xl leading-[1.02] text-bone max-w-lg">
                  The details
                  <br />
                  <span className="italic-display text-copper-100">define</span> the outcome.
                </h2>
              </Reveal>
              <Reveal delay={120}>
                <Link
                  href="/projects"
                  className="inline-flex h-12 items-center px-6 border border-bone/30 hover:border-bone hover:bg-bone hover:text-ink font-mono text-[11px] tracking-[0.2em] uppercase transition-all duration-500 w-full sm:w-auto justify-center"
                >
                  View All Projects
                </Link>
              </Reveal>
            </div>

            {featuredProjects && featuredProjects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {featuredProjects.map((p, i) => (
                  <Reveal key={p.id} delay={i * 100}>
                    <Link href={`/projects/${p.slug}`} className="group block">
                      <div className="relative aspect-[4/5] overflow-hidden bg-navy-100 mb-4 rounded-sm">
                        {p.hero_image_url ? (
                          <Image
                            src={p.hero_image_url}
                            alt={p.title}
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="object-cover transition-transform duration-1000 ease-editorial group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-navy-50 to-navy-200" />
                        )}
                      </div>
                      <div className="flex items-baseline justify-between text-sm text-bone/50 mb-2">
                        <span className="font-mono text-[11px] tracking-[0.15em] uppercase">
                          {p.location || "Augusta"}
                        </span>
                        <span className="font-mono text-[11px] tracking-[0.15em]">{p.year_completed ?? "—"}</span>
                      </div>
                      <h3 className="font-display text-xl sm:text-2xl text-bone group-hover:text-copper-100 transition-colors duration-500">
                        {p.title}
                      </h3>
                      {p.subtitle && <p className="mt-1.5 text-sm text-bone/60">{p.subtitle}</p>}
                    </Link>
                  </Reveal>
                ))}
              </div>
            ) : (
              <Reveal>
                <div className="surface-card-dark rounded-sm p-8 md:p-14 text-center max-w-3xl mx-auto">
                  <span className="eyebrow-copper">A new chapter</span>
                  <h3 className="font-display text-2xl sm:text-3xl md:text-4xl text-bone mt-5 leading-snug">
                    Our portfolio is being built — by hand, on-site, one project at a time.
                  </h3>
                  <p className="mt-5 text-bone/65 leading-relaxed text-sm sm:text-base max-w-lg mx-auto">
                    We&apos;re selective about the work we accept because we&apos;d rather do fewer things exceptionally than spread ourselves thin.
                  </p>
                  <Link
                    href="/book"
                    className="mt-8 inline-flex h-12 sm:h-14 items-center px-8 bg-copper text-bone hover:bg-copper-400 font-mono text-[11px] tracking-[0.2em] uppercase transition-colors duration-500"
                  >
                    Discuss Your Project
                  </Link>
                </div>
              </Reveal>
            )}
          </Container>
        </section>

        {/* TESTIMONIALS */}
        {testimonials && testimonials.length > 0 && (
          <section className="bg-paper section-pad border-t border-ink/10">
            <Container size="wide">
              <Reveal className="mb-10 md:mb-14">
                <span className="section-num">05 — In their words</span>
              </Reveal>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                {testimonials.map((t, i) => (
                  <Reveal key={t.id} delay={i * 100}>
                    <figure className="surface-card rounded-sm p-6 md:p-8 h-full flex flex-col">
                      <blockquote className="font-display text-xl sm:text-2xl leading-snug text-ink flex-1">
                        <span className="text-copper text-2xl leading-none">&ldquo;</span>
                        {t.quote}
                        <span className="text-copper text-2xl leading-none">&rdquo;</span>
                      </blockquote>
                      <figcaption className="mt-6 pt-6 border-t border-ink/10">
                        <div className="text-sm font-medium text-ink">{t.client_name}</div>
                        {t.client_title && (
                          <div className="text-xs uppercase tracking-widest text-stone-300 mt-1">{t.client_title}</div>
                        )}
                      </figcaption>
                    </figure>
                  </Reveal>
                ))}
              </div>
            </Container>
          </section>
        )}

        {/* CTA */}
        <section id="contact" className="bg-bone section-pad border-t border-ink/10">
          <Container size="wide">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-end">
              <div className="lg:col-span-7">
                <Reveal>
                  <span className="section-num">06 — Let&apos;s begin</span>
                </Reveal>
                <Reveal delay={100}>
                  <h2 className="mt-5 font-display text-display-2xl leading-[0.95] text-ink max-w-[12ch]">
                    Let&apos;s build
                    <br />
                    <span className="italic-display text-copper">something</span>
                    <br />
                    worth building.
                  </h2>
                </Reveal>
              </div>
              <div className="lg:col-span-5">
                <Reveal delay={200}>
                  <div className="border-t border-ink/12 pt-8 lg:pt-0 lg:border-t-0">
                    <p className="text-base sm:text-lg text-ink/70 leading-relaxed mb-8">
                      Whether you&apos;re early in planning or ready to break ground, we&apos;ll give you an honest assessment of how we can help.
                    </p>
                    <div className="flex flex-col gap-3">
                      <Link
                        href="/contact"
                        className="inline-flex h-14 items-center justify-center bg-ink text-bone hover:bg-copper font-mono text-xs tracking-[0.2em] uppercase transition-all duration-500"
                      >
                        Send an Inquiry
                      </Link>
                      <Link
                        href="/book"
                        className="inline-flex h-14 items-center justify-center border border-ink/25 hover:border-ink hover:bg-ink hover:text-bone font-mono text-xs tracking-[0.2em] uppercase transition-all duration-500"
                      >
                        Book a Consultation
                      </Link>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
