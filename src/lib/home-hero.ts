import { FEATURED_PROJECT } from "./featured-project";
import { SITE_IMAGES } from "./site-images";

/** Homepage hero background — drop hero-01.mp4 in public/video/ */
export const HOME_HERO_VIDEO = "/video/hero-01.mp4";

export const HOME_HERO_POSTER = SITE_IMAGES.heroConstruction;
export const HOME_HERO_POSTER_ALT = SITE_IMAGES.heroConstructionAlt;

/** Shown when video file is missing (dev) or reduced-motion */
export const HOME_HERO_FALLBACK = FEATURED_PROJECT.rendering;
export const HOME_HERO_FALLBACK_ALT = FEATURED_PROJECT.renderingAlt;
