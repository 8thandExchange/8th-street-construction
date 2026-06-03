import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { createClient } from "@/lib/supabase/server";
import { PROJECT_CATEGORY_LABELS } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Selected Work — Custom Homes & Commercial Projects in Augusta",
  description:
    "A selection of recent residential and commercial construction projects by 8th Street Construction in the Augusta, GA area.",
};

export default async function ProjectsIndex(
  props: {
    searchParams?: Promise<{ category?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const category = searchParams?.category;

  let query = supabase
    .from("projects")
    .select("id, slug, title, subtitle, category, location, year_completed, hero_image_url, excerpt")
    .neq("status", "draft")
    .order("display_order", { ascending: true })
    .order("year_completed", { ascending: false, nullsFirst: false });

  if (category && category in PROJECT_CATEGORY_LABELS) {
    query = query.eq("category", category);
  }

  const { data: projects } = await query;

  const categories = Object.entries(PROJECT_CATEGORY_LABELS);

  return (
    <>
      <SiteHeader />
      <main className="bg-bone text-ink">
        {/* Header */}
        <section className="pt-[calc(5.5rem+env(safe-area-inset-top))] pb-12 md:pt-[calc(7rem+env(safe-area-inset-top))] md:pb-24">
          <Container size="wide">
            <Reveal>
              <span className="section-num">— Selected Work</span>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="mt-6 font-display text-display-2xl leading-[0.95]">
                The work<br/>
                <span className="italic-display text-copper">speaks first.</span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-10 max-w-2xl text-lg text-ink/70 leading-relaxed">
                A selection of residential and commercial projects across the CSRA. Each one a study in craft, precision, and accountability.
              </p>
            </Reveal>
          </Container>
        </section>

        {/* Filter pills */}
        <section className="border-y border-ink/10 py-6 sticky top-0 z-30 bg-bone/95 backdrop-blur-sm">
          <Container size="wide">
            <div className="flex flex-wrap gap-2 md:gap-3">
              <Link
                href="/projects"
                className={`inline-flex items-center px-4 h-9 font-mono text-[11px] tracking-[0.18em] uppercase border transition-all duration-300 ${
                  !category
                    ? "bg-ink text-bone border-ink"
                    : "border-ink/20 text-ink hover:border-ink"
                }`}
              >
                All
              </Link>
              {categories.map(([value, label]) => (
                <Link
                  key={value}
                  href={`/projects?category=${value}`}
                  className={`inline-flex items-center px-4 h-9 font-mono text-[11px] tracking-[0.18em] uppercase border transition-all duration-300 ${
                    category === value
                      ? "bg-ink text-bone border-ink"
                      : "border-ink/20 text-ink hover:border-ink"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </Container>
        </section>

        {/* Grid */}
        <section className="py-16 md:py-24">
          <Container size="wide">
            {projects && projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                {projects.map((p, i) => (
                  <Reveal key={p.id} delay={(i % 3) * 100}>
                    <Link href={`/projects/${p.slug}`} className="group block">
                      <div className="relative aspect-[4/5] overflow-hidden bg-paper mb-5">
                        {p.hero_image_url ? (
                          <Image
                            src={p.hero_image_url}
                            alt={p.title}
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                            className="object-cover transition-transform duration-1000 ease-editorial group-hover:scale-105"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-stone-50 to-paper" />
                        )}
                      </div>
                      <div className="flex items-baseline justify-between text-xs font-mono tracking-[0.15em] uppercase text-stone-300 mb-3">
                        <span>{p.location || "Augusta"}</span>
                        <span>{p.year_completed ?? "—"}</span>
                      </div>
                      <h2 className="font-display text-3xl text-ink group-hover:text-copper transition-colors duration-500 leading-tight">
                        {p.title}
                      </h2>
                      {p.subtitle && (
                        <p className="mt-2 text-base text-ink/65">{p.subtitle}</p>
                      )}
                      <div className="mt-4 flex items-center gap-2 text-xs font-mono tracking-[0.18em] uppercase text-copper">
                        <span>View Project</span>
                        <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            ) : (
              <Reveal>
                <div className="border border-ink/15 p-12 md:p-20 text-center max-w-3xl mx-auto">
                  <span className="eyebrow-copper">— Coming soon</span>
                  <h2 className="mt-6 font-display text-3xl md:text-5xl leading-snug text-ink">
                    Our portfolio is being built.
                  </h2>
                  <p className="mt-6 max-w-xl mx-auto text-ink/65 leading-relaxed">
                    {category
                      ? `We don't have published projects in this category yet. Check back soon, or get in touch to discuss your project.`
                      : `We're documenting our recent work and adding it to this page. In the meantime, if you'd like to discuss a project, we'd love to hear from you.`}
                  </p>
                  <Link
                    href="/book"
                    className="mt-10 inline-flex h-12 items-center px-7 bg-ink text-bone hover:bg-copper font-mono text-[11px] tracking-[0.2em] uppercase transition-colors duration-500"
                  >
                    Discuss Your Project
                  </Link>
                </div>
              </Reveal>
            )}
          </Container>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
