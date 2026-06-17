import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { RenderingFrame } from "@/components/ui/RenderingFrame";
import { BrandTexture } from "@/components/site/BrandTexture";
import { getCollectionImage, getCollectionImageAlt } from "@/lib/collection-images";
import { ContourLines } from "./ContourLines";

const VALUES = [
  {
    title: "Craftsmanship",
    body: "We build a select number of homes each year — each one deserving the full attention of our team and trades who take pride in work that rewards close inspection.",
  },
  {
    title: "Transparency",
    body: "No hidden costs, no surprise change orders, no communication gaps. You will always know where your project stands — from first conversation through closeout.",
  },
  {
    title: "Quality",
    body: "Materials and methods chosen for longevity, not lowest bid. We specify for how a home ages in Augusta's climate — not how it photographs on day one.",
  },
  {
    title: "Longevity",
    body: "Structures composed for generations. We are not a production builder, a remodeler, or a volume contractor — we are a custom home studio building what endures.",
  },
] as const;

export function AboutSection() {
  return (
    <section id="about" className="relative bg-parchment section-pad overflow-hidden">
      <BrandTexture kind="linen" opacity={0.14} />
      <ContourLines className="text-ink" opacity={0.04} />

      <Container size="wide" className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-32">
            <Reveal>
              <RenderingFrame
                src={getCollectionImage("augusta")}
                alt={getCollectionImageAlt("The Augusta")}
                aspect="5/4"
                label="Field Journal · Augusta"
                sizes="(min-width: 1024px) 40vw, 100vw"
              />
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal>
              <span className="eyebrow-copper">About</span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 sm:mt-5 font-display text-display-xl text-ink leading-[1.02]">
                A custom home studio rooted in Augusta&apos;s architectural heritage.
              </h2>
            </Reveal>
            <Reveal delay={160} className="mt-5 sm:mt-6 md:mt-8">
              <p className="text-[15px] sm:text-lg text-ink/75 leading-relaxed max-w-xl">
                8th Street Construction designs and builds luxury residences for families who value permanence over pace. Every home is commissioned — composed for its site, documented as an architectural portrait, and built with the discipline of a field journal.
              </p>
            </Reveal>

            <div className="mt-8 sm:mt-10 md:mt-14 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
              {VALUES.map((v, i) => (
                <Reveal key={v.title} delay={220 + i * 60}>
                  <div className="border-t border-ink/12 pt-5 sm:pt-6 h-full">
                    <h3 className="font-display text-lg sm:text-xl md:text-2xl text-ink">{v.title}</h3>
                    <p className="mt-2.5 sm:mt-3 text-sm sm:text-[15px] text-ink/65 leading-relaxed">{v.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
