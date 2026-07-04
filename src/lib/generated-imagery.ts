/**
 * Brand imagery generated via Higgsfield (owned account), art-directed to the
 * 8th Street editorial-heritage aesthetic. Two families:
 *  - photo*: film-photography style images (atmosphere/craft/interiors)
 *  - wc*:    hand-drawn watercolor architectural renderings — always presented
 *            as illustrations, never as photographs of built work.
 * Served from the Higgsfield CDN (allow-listed in next.config). Swap entries
 * for owned photography as real project shoots happen.
 */

const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3FKaDTe0AKMeUNUmiqtjxEQGLrP";

export const GENERATED_IMAGERY = {
  photoHeroPorch: {
    src: `${CDN}/hf_20260704_013946_2a11b521-0a5f-4c73-8ea2-7b345de88495.png`,
    alt: "Lowcountry-style porch with white columns beneath a live oak at golden hour",
    w: 2752,
    h: 1536,
  },
  photoHeroBrickDusk: {
    src: `${CDN}/hf_20260704_013949_9833d6d8-c9e0-4a77-97e4-9fdb6ad27fa6.png`,
    alt: "Traditional brick home facade at dusk with warm lamplit windows",
    w: 2752,
    h: 1536,
  },
  photoOaksFog: {
    src: `${CDN}/hf_20260704_013950_e34d8c9b-3d3d-4c54-9b0b-0ee63cc6ffb1.png`,
    alt: "Live oaks draped in Spanish moss in morning fog",
    w: 3168,
    h: 1344,
  },
  photoFramingSunset: {
    src: `${CDN}/hf_20260704_013952_7b448629-bb26-4b01-b72f-96dd62ac6128.png`,
    alt: "Timber frame of a new home silhouetted against a sunset sky",
    w: 2752,
    h: 1536,
  },
  photoCraftPlane: {
    src: `${CDN}/hf_20260704_014002_345af532-b4d7-43a9-bd3c-9a5d87197882.png`,
    alt: "A carpenter's hands guiding a hand plane along heart pine",
    w: 2528,
    h: 1696,
  },
  photoCraftBrick: {
    src: `${CDN}/hf_20260704_014003_f4c0a4eb-1de0-4a47-afd1-b48315d404d3.png`,
    alt: "A mason's hands laying handmade brick with lime mortar",
    w: 2528,
    h: 1696,
  },
  photoInteriorKitchen: {
    src: `${CDN}/hf_20260704_014006_80d9dfb4-f781-453e-baf4-e0537650ea70.png`,
    alt: "Custom millwork kitchen with brass hardware in morning light",
    w: 2528,
    h: 1696,
  },
  photoInteriorStair: {
    src: `${CDN}/hf_20260704_014007_d2fe97d8-45e6-45c0-a00b-a32bcd86d6b3.png`,
    alt: "Handcrafted staircase with heart-pine handrail in afternoon light",
    w: 1856,
    h: 2304,
  },
  photoHeartPine: {
    src: `${CDN}/hf_20260704_014022_97b27b5d-10ef-489c-8d55-50e462702c8a.png`,
    alt: "Old-growth heart pine wood grain",
    w: 2528,
    h: 1696,
  },
  wcCottageElevation: {
    src: `${CDN}/hf_20260704_014016_7c5eb48f-3586-4f36-a846-813607efde4d.png`,
    alt: "Watercolor rendering of a Lowcountry cottage elevation",
    w: 2528,
    h: 1696,
  },
  wcPorchVignette: {
    src: `${CDN}/hf_20260704_014019_e39090e6-4b67-4c23-8a7b-d1ab79940128.png`,
    alt: "Watercolor vignette of a Southern porch corner",
    w: 1856,
    h: 2304,
  },
  wcStreetscape: {
    src: `${CDN}/hf_20260704_014021_6ea0af32-29c7-479e-865f-def2f0e3c0ca.png`,
    alt: "Watercolor rendering of a tree-lined Southern street",
    w: 3168,
    h: 1344,
  },
  wcCustomHome: {
    src: `${CDN}/hf_20260704_014035_f572f2ec-a2c7-4152-a697-61d953b98b59.png`,
    alt: "Watercolor rendering of a two-story Southern custom home",
    w: 2528,
    h: 1696,
  },
  wcRenovation: {
    src: `${CDN}/hf_20260704_014037_ca0cc49e-80f8-44f9-a7cc-1a1e9e34e0e0.png`,
    alt: "Watercolor rendering of a bungalow renovation in progress",
    w: 2528,
    h: 1696,
  },
  wcCommercial: {
    src: `${CDN}/hf_20260704_014039_3deaee4f-ff6c-441f-820d-058690c47210.png`,
    alt: "Watercolor rendering of a brick commercial streetfront",
    w: 2528,
    h: 1696,
  },
  wcTenantBuildout: {
    src: `${CDN}/hf_20260704_014042_3ceef02d-62a9-43a4-925d-14f8c5b9279c.png`,
    alt: "Watercolor rendering of a restaurant interior buildout",
    w: 2528,
    h: 1696,
  },
  wcDesignBuild: {
    src: `${CDN}/hf_20260704_014050_f8e817cd-fb81-4acf-97d8-9793f8d2db52.png`,
    alt: "Watercolor rendering of a cottage shown half sketch, half finished",
    w: 2528,
    h: 1696,
  },
  wcRestoration: {
    src: `${CDN}/hf_20260704_014052_6e29e8ba-6f52-40f1-9c2d-ea1e6052b290.png`,
    alt: "Watercolor rendering of an antebellum facade restoration",
    w: 2528,
    h: 1696,
  },
} as const;
