/**
 * The 8th Street Heritage Rendering System — design tokens
 */

export const HR_SYSTEM_NAME = "The 8th Street Heritage Rendering System";

export const HR_TOKENS = {
  colors: {
    parchment: "#f2ece0",
    warmWhite: "#f8f5ee",
    ink: "#1a1a18",
    graphite: "#6b645a",
    graphiteLight: "#a8a29a",
    rust: "#b5451b",
    gold: "#b89b5e",
    navy: "#101c2a",
  },
  linework: {
    primary: 1.25,
    secondary: 0.75,
    tertiary: 0.5,
    contour: 0.6,
  },
  opacity: {
    contour: 0.1,
    graphiteShade: 0.08,
    graphiteShadeDeep: 0.14,
    survey: 0.45,
    landscape: 0.55,
    annotation: 0.5,
    borderOuter: 0.22,
    borderInner: 0.1,
    sealEmboss: 0.85,
  },
  typography: {
    wordmark: {
      family: "var(--font-display), Georgia, serif",
      tracking: "0.22em",
      size: "uppercase",
    },
    taglinePrimary: {
      family: "var(--font-display), Georgia, serif",
      style: "normal",
    },
    taglineSecondary: {
      family: "var(--font-sans), system-ui, sans-serif",
      tracking: "0.18em",
      size: "uppercase",
    },
    annotation: {
      family: "var(--font-mono), ui-monospace, monospace",
      tracking: "0.12em",
    },
  },
} as const;

export const HR_COPY = {
  wordmark: "8TH STREET CONSTRUCTION",
  taglinePrimary: "Building What Endures.",
  taglineSecondary: "Crafted for Generations.",
  renderingLabel: "Heritage Rendering",
  fieldJournal: "Field Journal · Augusta",
} as const;

/** Elements that must never appear on Heritage Renderings */
export const HR_PROHIBITED = [
  "project numbers",
  "lot numbers",
  "subdivision references",
  "street addresses",
  "parcel identifiers",
  "permit numbers",
] as const;

/** Layers required on every Heritage Rendering */
export const HR_REQUIRED_LAYERS = [
  "warm-parchment-background",
  "black-ink-architectural-linework",
  "soft-graphite-shading",
  "topographic-contour-lines",
  "survey-references",
  "elevation-annotations",
  "southern-landscape-elements",
  "mature-trees",
  "architectural-border-treatment",
  "embossed-8th-street-seal",
] as const;

export type HRLayerId = (typeof HR_REQUIRED_LAYERS)[number];

export type HRTemplateId =
  | "website-hero"
  | "collection-card"
  | "project-book-cover"
  | "homeowner-presentation"
  | "social-media-post"
  | "jobsite-sign";
