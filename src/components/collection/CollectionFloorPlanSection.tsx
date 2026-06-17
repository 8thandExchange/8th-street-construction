import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { BrandTexture } from "@/components/site/BrandTexture";
import { ContourLines } from "@/components/home/ContourLines";
import { CollectionFloorPlan } from "./CollectionFloorPlan";
import type { CollectionPageData } from "@/lib/collection-pages";

type CollectionFloorPlanSectionProps = {
  floorPlan: CollectionPageData["floorPlan"];
};

export function CollectionFloorPlanSection({ floorPlan }: CollectionFloorPlanSectionProps) {
  return (
    <section className="relative bg-parchment section-pad overflow-hidden">
      <BrandTexture kind="blueprint" opacity={0.08} />
      <ContourLines className="text-ink" opacity={0.04} />

      <Container size="wide" className="relative">
        <Reveal className="max-w-xl mb-10 md:mb-14">
          <span className="eyebrow-copper">Floor Plan</span>
          <h2 className="mt-4 font-display text-display-md sm:text-display-lg text-ink leading-[1.05]">
            Explore the conceptual plan.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-ink/65 leading-relaxed">
            Interactive plan study — dimensions and room adjacencies refined during design development for your site.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <CollectionFloorPlan label={floorPlan.label} rooms={floorPlan.rooms} />
        </Reveal>
      </Container>
    </section>
  );
}
