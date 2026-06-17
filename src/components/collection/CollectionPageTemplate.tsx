import type { CollectionPageData } from "@/lib/collection-pages";
import { CollectionPageHero } from "./CollectionPageHero";
import { CollectionStory } from "./CollectionStory";
import { ArchitecturalHighlights } from "./ArchitecturalHighlights";
import { CollectionFloorPlanSection } from "./CollectionFloorPlanSection";
import { CollectionGallerySection } from "./CollectionGallerySection";
import { CollectionSpecifications } from "./CollectionSpecifications";
import { CollectionAvailability } from "./CollectionAvailability";

type CollectionPageTemplateProps = {
  home: CollectionPageData;
};

/**
 * Reusable luxury collection page — architecture portfolio, not builder brochure.
 */
export function CollectionPageTemplate({ home }: CollectionPageTemplateProps) {
  return (
    <>
      <CollectionPageHero home={home} />
      <CollectionStory story={home.story} />
      <ArchitecturalHighlights highlights={home.highlights} />
      <CollectionFloorPlanSection floorPlan={home.floorPlan} />
      <CollectionGallerySection home={home} />
      <CollectionSpecifications specs={home.specs} />
      <CollectionAvailability home={home} />
    </>
  );
}
