import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { RenderingFrame } from "@/components/ui/RenderingFrame";
import { BrandTexture } from "@/components/site/BrandTexture";
import { HERITAGE_PILLARS } from "@/lib/home-collection";
import { getCollectionImage, getCollectionImageAlt, getCollectionDimensions } from "@/lib/collection-images";
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
        <Reveal className="max-w-3xl mb-8 md:mb-12">
          <span className="eyebrow-copper">The Heritage Rendering System</span>
          <h2 className="mt-3 sm:mt-4 font-display text-display-xl text-ink leading-[1.02]">
            Every Home Tells a Story.
          </h2>
          <p className="mt-4 sm:mt-6 text-[15px] sm:text-lg text-ink/70 leading-relaxed max-w-2xl">
            Each home receives a custom architectural portrait documenting its design, craftsmanship, and character.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 lg:gap-16 items-start mb-10 md:mb-14">
          <Reveal delay={60}>
            <RenderingFrame
              src={getCollectionImage("augusta")}
              alt={getCollectionImageAlt("The Augusta")}
              dimensions={getCollectionDimensions("augusta")}
              label="Heritage Rendering · The Augusta"
              sizes="(min-width: 1024px) 42vw, 100vw"
            />
          </Reveal>

          <Reveal delay={120} className="flex flex-col gap-6 sm:gap-8 lg:pt-2">
            {HERITAGE_PILLARS.map((pillar) => (
              <div key={pillar.title} className="border-t border-ink/12 pt-5 sm:pt-6">
                <h3 className="font-sans text-[11px] tracking-[0.28em] uppercase text-rust">
                  {pillar.title}
                </h3>
                <p className="mt-3 text-sm sm:text-[15px] text-ink/65 leading-relaxed">{pillar.body}</p>
              </div>
            ))}
          </Reveal>
        </div>

        <Reveal delay={200}>
          <div className="surface-card rounded-sm p-6 sm:p-8 md:p-12">
            <p className="font-sans text-[11px] tracking-[0.28em] uppercase text-pencil mb-5 sm:mb-6">
              Each completed home receives
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 md:gap-8">
              {DELIVERABLES.map((item, i) => (
                <li key={item} className="flex gap-3 sm:gap-4 items-start">
                  <span className="font-mono text-sm text-gold shrink-0">0{i + 1}</span>
                  <span className="font-display text-base sm:text-lg md:text-xl text-ink leading-snug">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
