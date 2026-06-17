import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { BrandTexture } from "@/components/site/BrandTexture";
import { ContourLines } from "./ContourLines";
import { HeritageRendering } from "./HeritageRendering";

export type GalleryProject = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  location: string | null;
  hero_image_url: string | null;
  category: string | null;
};

type ProjectGalleryProps = {
  projects: GalleryProject[];
};

const MASONRY_SPANS = [
  "col-span-12 sm:col-span-7 row-span-2",
  "col-span-12 sm:col-span-5",
  "col-span-12 sm:col-span-5",
  "col-span-12 sm:col-span-7",
  "col-span-12 sm:col-span-6",
  "col-span-12 sm:col-span-6",
] as const;

export function ProjectGallery({ projects }: ProjectGalleryProps) {
  const items = projects.slice(0, 6);

  return (
    <section className="relative bg-navy text-parchment section-pad grain-overlay overflow-hidden">
      <BrandTexture kind="blueprint" opacity={0.2} />
      <ContourLines className="text-parchment" opacity={0.05} />

      <Container size="wide" className="relative">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 md:mb-16">
          <Reveal>
            <span className="font-sans text-[11px] tracking-[0.28em] uppercase text-gold">Project Portfolio</span>
            <h2 className="mt-4 font-display text-display-xl text-parchment leading-[1.02] max-w-lg">
              Renderings and completed residences across the CSRA.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <Link
              href="/projects"
              className="inline-flex h-12 items-center px-6 border border-parchment/25 hover:border-parchment hover:bg-parchment hover:text-ink font-sans text-[11px] tracking-[0.22em] uppercase transition-all duration-500 justify-center"
            >
              View All Projects
            </Link>
          </Reveal>
        </div>

        {items.length > 0 ? (
          <div className="gallery-masonry grid grid-cols-12 gap-4 md:gap-5 auto-rows-[minmax(12rem,auto)]">
            {items.map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 80} className={MASONRY_SPANS[i % MASONRY_SPANS.length]}>
                <Link href={`/projects/${p.slug}`} className="group block h-full min-h-[14rem]">
                  <div className="relative h-full min-h-[inherit] overflow-hidden bg-navy-100 border border-parchment/10">
                    {p.hero_image_url ? (
                      <Image
                        src={p.hero_image_url}
                        alt={p.title}
                        fill
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        className="object-cover brand-photo transition-transform duration-1000 ease-editorial group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="absolute inset-0 p-8 text-parchment/60">
                        <HeritageRendering variant="hero" template="collection-card" framed={false} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                      <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-parchment/50">
                        {p.location || "Augusta · CSRA"}
                      </span>
                      <h3 className="mt-2 font-display text-xl sm:text-2xl text-parchment group-hover:text-gold transition-colors duration-500">
                        {p.title}
                      </h3>
                      {p.subtitle && (
                        <p className="mt-1 text-sm text-parchment/55 line-clamp-2">{p.subtitle}</p>
                      )}
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal>
            <div className="surface-card-dark rounded-sm p-10 md:p-16 text-center max-w-2xl mx-auto">
              <p className="font-sans text-[11px] tracking-[0.28em] uppercase text-gold">Portfolio in progress</p>
              <h3 className="mt-5 font-display text-2xl sm:text-3xl text-parchment leading-snug">
                Each project documented with the same care we bring to the build.
              </h3>
              <Link
                href="#contact"
                className="mt-8 inline-flex h-12 items-center px-8 bg-rust text-parchment hover:bg-rust-200 font-sans text-[11px] tracking-[0.22em] uppercase transition-colors duration-500"
              >
                Discuss Your Project
              </Link>
            </div>
          </Reveal>
        )}
      </Container>
    </section>
  );
}
