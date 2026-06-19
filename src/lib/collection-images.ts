import type { CollectionVariant } from "./home-collection";

export type RenderingDimensions = {
  width: number;
  height: number;
};

/** Native pixel dimensions — all renderings share one uniform 1024×824 frame */
export const COLLECTION_DIMENSIONS: Record<CollectionVariant, RenderingDimensions> = {
  augusta: { width: 1024, height: 824 },
  savannah: { width: 1024, height: 824 },
  riverwalk: { width: 1024, height: 824 },
  summerville: { width: 1024, height: 824 },
  midtown: { width: 1024, height: 824 },
  broad: { width: 1024, height: 824 },
};

/** Heritage Rendering portraits — /public/img/collection/ */
export const COLLECTION_IMAGES: Record<CollectionVariant, string> = {
  augusta: "/img/collection/the-augusta.png",
  savannah: "/img/collection/the-savannah.png",
  riverwalk: "/img/collection/the-riverwalk.png",
  summerville: "/img/collection/the-summerville.png",
  midtown: "/img/collection/the-midtown.png",
  broad: "/img/collection/the-broad-street.png",
};

export function getCollectionImage(id: CollectionVariant): string {
  return COLLECTION_IMAGES[id];
}

export function getCollectionDimensions(id: CollectionVariant): RenderingDimensions {
  return COLLECTION_DIMENSIONS[id];
}

export function getCollectionImageAlt(name: string): string {
  return `${name} — architectural portrait rendering`;
}

export const FEATURED_RENDERING_DIMENSIONS: RenderingDimensions = {
  width: 1402,
  height: 1122,
};

/** Uniform frame for homepage collection grid — matches the rendering aspect */
export const COLLECTION_CARD_DIMENSIONS: RenderingDimensions = {
  width: 1024,
  height: 824,
};
