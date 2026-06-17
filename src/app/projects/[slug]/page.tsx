import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { createAnonymousClient } from "@/lib/supabase/anonymous";
import { PROJECT_CATEGORY_LABELS } from "@/lib/utils";
import { isPortfolioIllustration } from "@/lib/portfolio-examples";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { FEATURED_PROJECT } from "@/lib/featured-project";

export const revalidate = 1800;
export const dynamicParams = true;

export async function generateStaticParams() {
  const supabase = createAnonymousClient();
  const { data } = await supabase
    .from("projects")
    .select("slug")
    .neq("status", "draft")
    .neq("status", "archived")
    .limit(50);
  return (data ?? []).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const supabase = createAnonymousClient();
  const { data: project } = await supabase
    .from("projects")
    .select("title, subtitle, meta_description, hero_image_url, excerpt")
    .eq("slug", params.slug)
    .neq("status", "draft")
    .neq("status", "archived")
    .single();
  if (!project) return { title: "Project Not Found" };
  return {
    title: project.title,
    description: project.meta_description || project.excerpt || project.subtitle,
    openGraph: {
      title: project.title,
      description: project.meta_description || project.excerpt || project.subtitle || undefined,
      images: project.hero_image_url ? [{ url: project.hero_image_url }] : [],
    },
  };
}

export default async function ProjectDetail(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const supabase = createAnonymousClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", params.slug)
    .neq("status", "draft")
    .neq("status", "archived")
    .single();

  if (!project) notFound();

  const { data: images } = await supabase
    .from("project_images")
    .select("id, public_url, caption, alt_text, display_order, is_hero, width, height")
    .eq("project_id", project.id)
    .eq("visibility", "public")
    .order("display_order", { ascending: true });

  const heroImage = images?.find((i) => i.is_hero) ?? images?.[0];
  const galleryImages = (images ?? []).filter((i) => i.id !== heroImage?.id);

  const categoryLabel = PROJECT_CATEGORY_LABELS[project.category] ?? project.category;
  const illustration = isPortfolioIllustration(project.slug);
  const localHero =
    project.slug === FEATURED_PROJECT.slug ? FEATURED_PROJECT.rendering : null;
  const heroSrc =
    heroImage?.public_url || project.hero_image_url || localHero;

  return (
    <>
      <SiteHeader dark={!!heroSrc} />
      <main className="bg-bone text-ink">
        {/* Hero image full-bleed */}
        <section className="relative w-full h-[60vh] md:h-[85vh] bg-navy overflow-hidden">
          {heroSrc ? (
            <Image
              src={heroSrc}
              alt={heroImage?.alt_text || FEATURED_PROJECT.renderingAlt || project.title}
              fill
              priority
              className="object-cover brand-photo"
              sizes="100vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-100 to-navy-200 grain-overlay" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent" />
          <Container size="wide" className="absolute bottom-0 left-0 right-0 pb-12 md:pb-20 z-10">
            <Reveal>
              <span className="eyebrow-copper">
                — {illustration ? "Illustrative example" : categoryLabel}
              </span>
            </Reveal>
            <Reveal delay={150}>
              <h1 className="mt-4 font-display text-display-xl text-bone leading-[0.95]">
                {project.title}
              </h1>
            </Reveal>
            {project.subtitle && (
              <Reveal delay={250}>
                <p className="mt-4 max-w-2xl text-lg md:text-xl text-bone/80">
                  {project.subtitle}
                </p>
              </Reveal>
            )}
          </Container>
        </section>

        {/* Metadata strip */}
        <section className="border-b border-ink/10 py-10 md:py-12">
          <Container size="wide">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                ["Location", project.location || "Augusta · CSRA"],
                ...(illustration
                  ? []
                  : [
                      ["Year", project.year_completed?.toString() || "—"],
                      [
                        "Scope",
                        project.square_footage
                          ? `${project.square_footage.toLocaleString()} sq ft`
                          : "—",
                      ],
                    ]),
                ["Category", categoryLabel],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="eyebrow mb-2">{label}</div>
                  <div className="font-display text-xl md:text-2xl">{value}</div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Narrative */}
        {project.narrative && (
          <section className="py-20 md:py-32">
            <Container size="narrow">
              <Reveal>
                <span className="section-num">— Project notes</span>
              </Reveal>
              <Reveal delay={100}>
                <div className="mt-10 prose prose-lg max-w-none font-sans text-ink/85 leading-relaxed whitespace-pre-wrap">
                  {project.narrative}
                </div>
              </Reveal>
            </Container>
          </section>
        )}

        {/* Gallery */}
        {galleryImages.length > 0 && (
          <section className="py-12 md:py-20 bg-paper">
            <Container size="wide">
              <Reveal className="mb-12">
                <span className="section-num">— Gallery</span>
              </Reveal>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                {galleryImages.map((img, i) => (
                  <Reveal
                    key={img.id}
                    delay={(i % 2) * 100}
                    className={i % 3 === 0 ? "md:col-span-2" : ""}
                  >
                    <figure>
                      <div
                        className={`relative bg-bone overflow-hidden ${
                          i % 3 === 0 ? "aspect-[16/9]" : "aspect-[4/5]"
                        }`}
                      >
                        <Image
                          src={img.public_url}
                          alt={img.alt_text || project.title}
                          fill
                          sizes="(min-width: 768px) 50vw, 100vw"
                          className="object-cover brand-photo"
                        />
                      </div>
                      {img.caption && (
                        <figcaption className="mt-3 text-xs font-mono tracking-wider text-stone-300 uppercase">
                          {img.caption}
                        </figcaption>
                      )}
                    </figure>
                  </Reveal>
                ))}
              </div>
            </Container>
          </section>
        )}

        {/* CTA */}
        <section className="bg-bone py-20 md:py-32 border-t border-ink/10">
          <Container size="wide">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 md:col-span-7">
                <Reveal>
                  <h2 className="font-display text-display-lg leading-[1.02]">
                    Want something<br/>
                    <span className="italic-display text-copper">like this?</span>
                  </h2>
                </Reveal>
              </div>
              <div className="col-span-12 md:col-span-5 flex flex-col gap-3 justify-end">
                <Reveal delay={150}>
                  <Link
                    href="/book"
                    className="inline-flex w-full h-14 items-center justify-center bg-ink text-bone hover:bg-copper font-mono text-xs tracking-[0.2em] uppercase transition-colors duration-500"
                  >
                    Start a Conversation
                  </Link>
                </Reveal>
                <Reveal delay={250}>
                  <Link
                    href="/projects"
                    className="inline-flex w-full h-14 items-center justify-center border border-ink/30 hover:border-ink hover:bg-ink hover:text-bone font-mono text-xs tracking-[0.2em] uppercase transition-all duration-500"
                  >
                    More Projects
                  </Link>
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
