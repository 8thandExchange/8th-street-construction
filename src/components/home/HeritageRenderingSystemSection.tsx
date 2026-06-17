import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { BrandTexture } from "@/components/site/BrandTexture";
import { HERITAGE_PILLARS } from "@/lib/home-collection";
import { HeritageRendering } from "@/components/heritage-rendering/HeritageRendering";
import { ContourLines } from "./ContourLines";

const DELIVERABLES = [
  "Custom architectural portrait",
  "Construction archive",
  "Homeowner presentation piece",
  "Project story",
] as const;

export function HeritageRenderingSystemSection() {
  return (
    <section
      id="heritage-rendering"
      className="relative bg-warm-white section-pad border-y border-ink/8 overflow-hidden"
    >
      <BrandTexture kind="linen" opacity={0.12} />
      <ContourLines className="text-navy" opacity={0.05} />

      <Container size="wide" className="relative">
        <Reveal className="max-w-3xl mb-12 md:mb-16">
          <span className="eyebrow-copper">The Heritage Rendering System</span>
          <h2 className="mt-4 font-display text-display-xl text-ink leading-[1.02]">
            Every Home Tells a Story.
          </h2>
          <p className="mt-6 text-base sm:text-lg text-ink/70 leading-relaxed max-w-2xl">
            Each home receives a custom architectural portrait documenting its design, craftsmanship, and character.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 mb-14 md:mb-20">
          <Reveal delay={60} className="lg:col-span-5">
            <div className="relative aspect-[4/5] border border-ink/10 overflow-hidden bg-parchment">
              <HeritageRendering variant="augusta" template="homeowner-presentation" title="The Augusta" />
            </div>
            <p className="mt-3 font-sans text-[10px] tracking-[0.18em] uppercase text-pencil">
              Rendering Example
            </p>
          </Reveal>

          <Reveal delay={120} className="lg:col-span-3">
            <div className="relative aspect-square border border-ink/10 bg-parchment p-6 flex items-center justify-center">
              <HeritageRendering variant="hero" template="social-media-post" framed={false} />
            </div>
            <p className="mt-3 font-sans text-[10px] tracking-[0.18em] uppercase text-pencil">
              Embossed Seal
            </p>
          </Reveal>

          <Reveal delay={180} className="lg:col-span-4 flex flex-col gap-6">
            {HERITAGE_PILLARS.map((pillar, i) => (
              <div key={pillar.title} className="border-t border-ink/12 pt-5">
                <h3 className="font-sans text-[11px] tracking-[0.28em] uppercase text-rust">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm text-ink/65 leading-relaxed">{pillar.body}</p>
              </div>
            ))}
          </Reveal>
        </div>

        <Reveal delay={200}>
          <div className="surface-card rounded-sm p-8 md:p-12">
            <p className="font-sans text-[11px] tracking-[0.28em] uppercase text-pencil mb-6">
              Each completed home receives
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {DELIVERABLES.map((item, i) => (
                <li key={item} className="flex gap-4 items-start">
                  <span className="font-mono text-sm text-gold shrink-0">0{i + 1}</span>
                  <span className="font-display text-lg sm:text-xl text-ink leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
