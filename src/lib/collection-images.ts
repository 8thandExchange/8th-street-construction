import type { CollectionVariant } from "./home-collection";

export type RenderingDimensions = {
  width: number;
  height: number;
};

/** Native pixel dimensions — drives layout without cropping */
export const COLLECTION_DIMENSIONS: Record<CollectionVariant, RenderingDimensions> = {
  augusta: { width: 1402, height: 1122 },
  savannah: { width: 1145, height: 1373 },
  riverwalk: { width: 1145, height: 1374 },
  summerville: { width: 1146, height: 1372 },
  midtown: { width: 1402, height: 1122 },
  broad: { width: 1402, height: 1122 },
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
