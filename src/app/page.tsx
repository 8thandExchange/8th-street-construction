import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Reveal } from "@/components/ui/Reveal";
import { Container } from "@/components/ui/Container";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 3600; // ISR every hour

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
    body: "We listen first. Understanding your vision, constraints, and goals before proposing anything. The right questions prevent the wrong answers.",
  },
  {
    n: "02",
    title: "Plan",
    body: "Detailed scoping, honest budgeting, and realistic scheduling. We identify risks early and plan around them — not through them.",
  },
  {
    n: "03",
    title: "Build",
    body: "Execution with precision. Daily progress tracking, consistent communication, and quality checkpoints at every milestone. No shortcuts.",
  },
  {
    n: "04",
    title: "Deliver",
    body: "Thorough walkthrough, clean handoff, and complete documentation. We don't disappear after the final nail — we stand behind our work.",
  },
];

const PRINCIPLES = [
  {
    title: "Craft Over Speed",
    body: "We'd rather build one project right than rush through three. Quality is the only metric that matters when the structure has to last generations.",
  },
  {
    title: "Radical Transparency",
    body: "No hidden costs, no surprise change orders, no communication gaps. You'll always know where your project stands — budget, timeline, scope.",
  },
  {
    title: "Total Accountability",
    body: "We stand behind our work. Period. Every detail, every finish, every deadline — we own it all, and we answer directly to you.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();

  // Featured projects — gracefully handles empty
  const { data: featuredProjects } = await supabase
    .from("projects")
    .select("id, slug, title, subtitle, category, location, year_completed, hero_image_url, excerpt")
    .neq("status", "draft")
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
      <SiteHeader dark />
      <main className="bg-bone text-ink">
        {/* ====================================================
            HERO — full-bleed dark navy with editorial type
            ==================================================== */}
        <section className="relative min-h-screen bg-navy text-bone overflow-hidden grain-overlay">
          {/* Diagonal copper line accent */}
          <div className="absolute top-0 right-0 w-px h-full bg-copper/40 hidden md:block" style={{ right: "8%" }} />
          <div className="absolute top-0 left-0 w-1/3 h-px bg-bone/10 mt-32" />

          <Container size="wide" className="relative pt-32 md:pt-44 pb-20">
            <div className="grid grid-cols-12 gap-6">
              {/* Eyebrow + location */}
              <div className="col-span-12 lg:col-span-2 mb-8 lg:mb-0">
                <Reveal className="flex flex-col gap-2">
                  <span className="eyebrow-copper">— Augusta · CSRA</span>
                  <span className="eyebrow text-bone/40">Est. 8 &amp; Exchange Capital</span>
                </Reveal>
              </div>

              {/* Headline */}
              <div className="col-span-12 lg:col-span-10">
                <Reveal>
                  <h1 className="font-display text-display-2xl text-bone leading-[0.92]">
                    Building
                    <br />
                    <span className="italic-display text-copper-100">what</span> endures.
                  </h1>
                </Reveal>

                <Reveal delay={300} className="mt-12 grid grid-cols-12 gap-6">
                  <p className="col-span-12 md:col-span-7 lg:col-span-5 text-lg md:text-xl text-bone/75 leading-relaxed">
                    Custom homes and commercial construction rooted in craft, precision, and a commitment to structures that stand the test of time.
                  </p>
                  <div className="col-span-12 md:col-span-5 lg:col-span-4 lg:col-start-9 flex flex-col gap-3 mt-4 md:mt-0 self-end">
                    <Link
                      href="/book"
                      className="inline-flex h-14 items-center justify-center bg-copper text-bone hover:bg-copper-400 font-mono text-xs tracking-[0.2em] uppercase transition-colors duration-500"
                    >
                      Start a Conversation
                    </Link>
                    <Link
                      href="/projects"
                      className="inline-flex h-14 items-center justify-center border border-bone/25 hover:border-bone hover:bg-bone hover:text-ink font-mono text-xs tracking-[0.2em] uppercase transition-all duration-500"
                    >
                      Selected Work
                    </Link>
                  </div>
                </Reveal>
              </div>
            </div>

            {/* Bottom strip */}
            <div className="absolute bottom-8 left-0 right-0">
              <Container size="wide">
                <div className="flex justify-between items-end">
                  <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-bone/40 flex items-center gap-3">
                    <span className="block w-12 h-px bg-bone/30 animate-subtle-pulse" />
                    Scroll
                  </div>
                  <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-bone/40 hidden md:block">
                    © {new Date().getFullYear()} — A Builder's Standard
                  </div>
                </div>
              </Container>
            </div>
          </Container>
        </section>

        {/* ====================================================
            STATS STRIP
            ==================================================== */}
        <section className="bg-bone py-20 md:py-28 rule-bottom">
          <Container size="wide">
            <Reveal className="mb-12">
              <span className="eyebrow-copper">— By the numbers</span>
            </Reveal>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 md:gap-6">
              {STATS.map((stat, i) => (
                <Reveal key={stat.label} delay={i * 100}>
                  <div className="border-t border-ink/15 pt-6">
                    <div className="font-display text-display-lg text-ink leading-none">
                      {stat.value}
                    </div>
                    <div className="eyebrow mt-4 text-stone-300">{stat.label}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ====================================================
            ABOUT / BUILDER'S STANDARD
            ==================================================== */}
        <section id="about" className="bg-bone py-24 md:py-40 relative">
          <Container size="wide">
            <div className="grid grid-cols-12 gap-6 lg:gap-12">
              <div className="col-span-12 lg:col-span-3">
                <Reveal>
                  <div className="sticky top-32">
                    <span className="section-num">01 — Who we are</span>
                  </div>
                </Reveal>
              </div>
              <div className="col-span-12 lg:col-span-9">
                <Reveal>
                  <h2 className="font-display text-display-xl leading-[1.02] text-ink mb-12">
                    A builder's standard.
                    <br />
                    <span className="italic-display text-copper">A client's</span> trust.
                  </h2>
                </Reveal>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 max-w-4xl">
                  <Reveal delay={150}>
                    <p className="text-lg leading-relaxed text-ink/85">
                      8th Street Construction brings decades of combined experience to every residential and commercial project in the Augusta market — from custom homes to ground-up commercial builds.
                    </p>
                  </Reveal>
                  <Reveal delay={250}>
                    <p className="text-lg leading-relaxed text-ink/85">
                      We exist because the CSRA deserves a builder who treats every project — regardless of scale — with institutional-grade planning and genuine personal accountability. No shortcuts, no handoffs to crews you've never met, no disappearing when things get complicated.
                    </p>
                  </Reveal>
                </div>

                {/* Principles */}
                <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-10 border-t border-ink/15 pt-12">
                  {PRINCIPLES.map((p, i) => (
                    <Reveal key={p.title} delay={i * 120}>
                      <div>
                        <h3 className="font-display text-2xl text-ink mb-3">{p.title}</h3>
                        <p className="text-base text-ink/70 leading-relaxed">{p.body}</p>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* ====================================================
            SERVICES (CMS-driven)
            ==================================================== */}
        <section id="services" className="bg-paper py-24 md:py-40 rule-top">
          <Container size="wide">
            <div className="grid grid-cols-12 gap-6 lg:gap-12 mb-16 md:mb-24">
              <div className="col-span-12 lg:col-span-3">
                <Reveal>
                  <span className="section-num">02 — What we build</span>
                </Reveal>
              </div>
              <div className="col-span-12 lg:col-span-9">
                <Reveal>
                  <h2 className="font-display text-display-xl leading-[1.02] text-ink">
                    Residential <span className="italic-display">&amp;</span>
                    <br />
                    commercial<br/>construction services.
                  </h2>
                </Reveal>
                <Reveal delay={200}>
                  <p className="mt-8 max-w-xl text-lg text-ink/70 leading-relaxed">
                    Full-service construction — from pre-construction planning through final walkthrough and beyond. One team, one standard.
                  </p>
                </Reveal>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-ink/15">
              {(services ?? []).map((service, i) => (
                <Reveal key={service.slug} delay={i * 80} className="bg-paper">
                  <Link
                    href={`/services#${service.slug}`}
                    className="group flex flex-col h-full p-8 md:p-10 bg-paper hover:bg-bone transition-colors duration-500"
                  >
                    <div className="flex items-baseline justify-between mb-6">
                      <span className="section-num">
                        0{i + 1}
                      </span>
                      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-stone-300 group-hover:text-copper transition-colors duration-500">
                        →
                      </span>
                    </div>
                    <h3 className="font-display text-3xl text-ink mb-4 group-hover:text-copper transition-colors duration-500">
                      {service.name}
                    </h3>
                    <p className="text-[15px] text-ink/70 leading-relaxed flex-1">
                      {service.short_description}
                    </p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ====================================================
            PROCESS
            ==================================================== */}
        <section id="approach" className="bg-bone py-24 md:py-40 rule-top">
          <Container size="wide">
            <div className="grid grid-cols-12 gap-6 lg:gap-12 mb-16">
              <div className="col-span-12 lg:col-span-3">
                <Reveal>
                  <span className="section-num">03 — How we work</span>
                </Reveal>
              </div>
              <div className="col-span-12 lg:col-span-9">
                <Reveal>
                  <h2 className="font-display text-display-xl leading-[1.02] text-ink">
                    A disciplined<br/>process.<br/>
                    <span className="italic-display text-copper">No surprises.</span>
                  </h2>
                </Reveal>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-ink/15">
              {PROCESS.map((step, i) => (
                <Reveal key={step.n} delay={i * 100} className="bg-bone">
                  <div className="p-8 md:p-10 h-full bg-bone">
                    <div className="font-mono text-sm tracking-[0.15em] text-copper mb-8">
                      {step.n}
                    </div>
                    <h3 className="font-display text-3xl text-ink mb-4">{step.title}</h3>
                    <p className="text-[15px] text-ink/70 leading-relaxed">{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* ====================================================
            SELECTED WORK — gracefully empty
            ==================================================== */}
        <section className="bg-navy text-bone py-24 md:py-40 grain-overlay">
          <Container size="wide" className="relative">
            <div className="grid grid-cols-12 gap-6 lg:gap-12 mb-16 md:mb-24">
              <div className="col-span-12 lg:col-span-3">
                <Reveal>
                  <span className="font-mono text-[13px] tracking-[0.15em] text-copper-100">
                    04 — Selected work
                  </span>
                </Reveal>
              </div>
              <div className="col-span-12 lg:col-span-9 flex flex-col md:flex-row md:items-end justify-between gap-8">
                <Reveal>
                  <h2 className="font-display text-display-xl leading-[1.02] text-bone">
                    The details<br/>
                    <span className="italic-display text-copper-100">define</span> the outcome.
                  </h2>
                </Reveal>
                <Reveal delay={200}>
                  <Link
                    href="/projects"
                    className="inline-flex h-12 items-center px-6 border border-bone/30 hover:border-bone hover:bg-bone hover:text-ink font-mono text-[11px] tracking-[0.2em] uppercase transition-all duration-500 whitespace-nowrap"
                  >
                    View All Projects
                  </Link>
                </Reveal>
              </div>
            </div>

            {featuredProjects && featuredProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredProjects.map((p, i) => (
                  <Reveal key={p.id} delay={i * 120}>
                    <Link href={`/projects/${p.slug}`} className="group block">
                      <div className="relative aspect-[4/5] overflow-hidden bg-navy-100 mb-5">
                        {p.hero_image_url ? (
                          <Image
                            src={p.hero_image_url}
                            alt={p.title}
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                            className="object-cover transition-transform duration-1000 ease-editorial group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-navy-50 to-navy-200" />
                        )}
                      </div>
                      <div className="flex items-baseline justify-between text-sm text-bone/50 mb-3">
                        <span className="font-mono text-[11px] tracking-[0.15em] uppercase">
                          {p.location || "Augusta"}
                        </span>
                        <span className="font-mono text-[11px] tracking-[0.15em]">
                          {p.year_completed ?? "—"}
                        </span>
                      </div>
                      <h3 className="font-display text-2xl text-bone group-hover:text-copper-100 transition-colors duration-500">
                        {p.title}
                      </h3>
                      {p.subtitle && (
                        <p className="mt-2 text-sm text-bone/60">{p.subtitle}</p>
                      )}
                    </Link>
                  </Reveal>
                ))}
              </div>
            ) : (
              <Reveal>
                <div className="border border-bone/15 p-10 md:p-16 text-center">
                  <span className="eyebrow-copper">— A new chapter</span>
                  <h3 className="font-display text-3xl md:text-4xl text-bone mt-6 max-w-2xl mx-auto leading-snug">
                    Our portfolio is being built — by hand, on-site, one project at a time.
                  </h3>
                  <p className="mt-6 max-w-xl mx-auto text-bone/65 leading-relaxed">
                    We're selective about the work we accept because we'd rather do fewer things exceptionally than spread ourselves thin. If you're considering a project, we'd love to hear about it.
                  </p>
                  <Link
                    href="/book"
                    className="mt-10 inline-flex h-12 items-center px-7 bg-copper text-bone hover:bg-copper-400 font-mono text-[11px] tracking-[0.2em] uppercase transition-colors duration-500"
                  >
                    Discuss Your Project
                  </Link>
                </div>
              </Reveal>
            )}
          </Container>
        </section>

        {/* ====================================================
            TESTIMONIALS — gracefully hidden if empty
            ==================================================== */}
        {testimonials && testimonials.length > 0 && (
          <section className="bg-paper py-24 md:py-32 rule-bottom">
            <Container size="wide">
              <Reveal className="mb-16">
                <span className="section-num">05 — In their words</span>
              </Reveal>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12">
                {testimonials.map((t, i) => (
                  <Reveal key={t.id} delay={i * 120}>
                    <figure className="flex flex-col gap-6">
                      <blockquote className="font-display text-2xl leading-snug text-ink">
                        <span className="text-copper text-3xl leading-none">"</span>
                        {t.quote}
                        <span className="text-copper text-3xl leading-none">"</span>
                      </blockquote>
                      <figcaption>
                        <div className="text-sm font-medium text-ink">{t.client_name}</div>
                        {t.client_title && (
                          <div className="text-xs uppercase tracking-widest text-stone-300 mt-1">
                            {t.client_title}
                          </div>
                        )}
                      </figcaption>
                    </figure>
                  </Reveal>
                ))}
              </div>
            </Container>
          </section>
        )}

        {/* ====================================================
            FINAL CTA
            ==================================================== */}
        <section id="contact" className="bg-bone py-24 md:py-40">
          <Container size="wide">
            <div className="grid grid-cols-12 gap-6 lg:gap-12 items-end">
              <div className="col-span-12 lg:col-span-7">
                <Reveal>
                  <span className="section-num">06 — Let's begin</span>
                </Reveal>
                <Reveal delay={100}>
                  <h2 className="mt-6 font-display text-display-2xl leading-[0.95] text-ink">
                    Let's build<br/>
                    <span className="italic-display text-copper">something</span>
                    <br/>worth building.
                  </h2>
                </Reveal>
              </div>
              <div className="col-span-12 lg:col-span-5">
                <Reveal delay={250}>
                  <div className="border-t border-ink/15 pt-8">
                    <p className="text-lg text-ink/70 leading-relaxed mb-8">
                      Whether you're early in the planning process or ready to break ground, we're happy to talk. Tell us about your project and we'll give you an honest assessment.
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
                        className="inline-flex h-14 items-center justify-center border border-ink/30 hover:border-ink hover:bg-ink hover:text-bone font-mono text-xs tracking-[0.2em] uppercase transition-all duration-500"
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
