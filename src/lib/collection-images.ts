import type { CollectionVariant } from "./home-collection";

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

export function getCollectionImageAlt(name: string): string {
  return `${name} — architectural portrait rendering`;
}
