import { getCollectionHomes } from "./collection-pages";

export type CollectionVariant =
  | "augusta"
  | "savannah"
  | "riverwalk"
  | "summerville"
  | "midtown"
  | "broad";

export type CollectionHome = {
  id: CollectionVariant;
  slug: string;
  name: string;
  description: string;
  detail: string;
};

/** @deprecated Use getCollectionHomes() from collection-pages */
export const COLLECTION_HOMES: CollectionHome[] = getCollectionHomes();

export const PROCESS_STEPS = [
  {
    n: "01",
    title: "Discover",
    body: "We begin with listening — your land, your family, your sense of place in Augusta and the CSRA.",
  },
  {
    n: "02",
    title: "Plan",
    body: "Drawings, budgets, and schedules shaped with honesty. Every decision documented before ground breaks.",
  },
  {
    n: "03",
    title: "Build",
    body: "Field execution with owner involvement, milestone clarity, and craft that rewards close inspection.",
  },
  {
    n: "04",
    title: "Deliver",
    body: "A completed home, a Heritage Rendering, and an archive worthy of the generations who will live there.",
  },
] as const;

export const HERITAGE_PILLARS = [
  {
    title: "Design",
    body: "Every home begins as an architectural portrait — proportion, material, and light composed for Southern living.",
  },
  {
    title: "Construction",
    body: "Built by a single accountable team. No production shortcuts. No anonymous subs. No corners cut.",
  },
  {
    title: "Legacy",
    body: "Each completed home enters the Collection with a permanent record — for your family and for ours.",
  },
] as const;
