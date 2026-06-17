import { FEATURED_PROJECT } from "./featured-project";

/** Owned brand photography — local assets in /public/img */
export const SITE_IMAGES = {
  hero: FEATURED_PROJECT.rendering,
  heroFallback: FEATURED_PROJECT.rendering,
  heroAlt: FEATURED_PROJECT.renderingAlt,
  craft: "/img/craft.jpg",
  craftAlt: "Timber and steel structural detail on a jobsite",
  interior: "/img/interior.jpg",
  interiorAlt: "Architectural blueprints and elevation drawings",
  commercial: "/img/commercial.jpg",
  commercialAlt: "Commercial concrete formwork during construction",
  aerialAugusta: "/img/aerial-augusta.jpg",
  aerialAugustaAlt: "Aerial view of Augusta, Georgia",
  heroConstruction: "/img/hero-construction.jpg",
  heroConstructionAlt: "Active residential construction site",
} as const;

export const SITE_TEXTURES = {
  linen: "/img/texture-linen.jpg",
  blueprint: "/img/texture-blueprint.jpg",
} as const;
