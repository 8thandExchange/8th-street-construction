import { FEATURED_PROJECT } from "./featured-project";
import { GENERATED_IMAGERY } from "./generated-imagery";

/** Brand imagery — featured-project rendering plus art-directed generated set */
export const SITE_IMAGES = {
  hero: FEATURED_PROJECT.rendering,
  heroFallback: FEATURED_PROJECT.rendering,
  heroAlt: FEATURED_PROJECT.renderingAlt,
  craft: GENERATED_IMAGERY.photoCraftPlane.src,
  craftAlt: GENERATED_IMAGERY.photoCraftPlane.alt,
  interior: GENERATED_IMAGERY.photoInteriorKitchen.src,
  interiorAlt: GENERATED_IMAGERY.photoInteriorKitchen.alt,
  commercial: GENERATED_IMAGERY.wcCommercial.src,
  commercialAlt: GENERATED_IMAGERY.wcCommercial.alt,
  aerialAugusta: GENERATED_IMAGERY.photoOaksFog.src,
  aerialAugustaAlt: GENERATED_IMAGERY.photoOaksFog.alt,
  heroConstruction: GENERATED_IMAGERY.photoFramingSunset.src,
  heroConstructionAlt: GENERATED_IMAGERY.photoFramingSunset.alt,
} as const;

export const SITE_TEXTURES = {
  linen: "/img/texture-linen.jpg",
  blueprint: "/img/texture-blueprint.jpg",
} as const;
