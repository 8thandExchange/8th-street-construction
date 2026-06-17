import type { HRTemplateId } from "./tokens";

export type { HRTemplateId };

export type HRTemplateSpec = {
  id: HRTemplateId;
  name: string;
  description: string;
  aspectRatio: string;
  width: number;
  height: number;
  safeMargin: string;
  typography: {
    wordmark: boolean;
    taglinePrimary: boolean;
    taglineSecondary: boolean;
    title?: boolean;
  };
  seal: {
    position: "bottom-right" | "bottom-left" | "top-right" | "center-bottom";
    size: "sm" | "md" | "lg";
  };
  border: "full" | "compact" | "formal" | "minimal";
  landscapeDensity: "full" | "moderate" | "simplified";
  contourDensity: "full" | "light" | "moderate" | "simplified";
  notes: string[];
};

export const HR_TEMPLATE_SPECS: Record<HRTemplateId, HRTemplateSpec> = {
  "website-hero": {
    id: "website-hero",
    name: "Website Hero",
    description:
      "Full-width hero companion — large framed elevation for homepage and collection hero panels. Typography lives in page layout; rendering carries border, seal, and field-journal layers.",
    aspectRatio: "4 / 3",
    width: 960,
    height: 720,
    safeMargin: "5%",
    typography: {
      wordmark: false,
      taglinePrimary: false,
      taglineSecondary: false,
    },
    seal: { position: "bottom-right", size: "md" },
    border: "full",
    landscapeDensity: "full",
    contourDensity: "full",
    notes: [
      "Pair with left-column copy on desktop; stack on mobile.",
      "Minimum rendered height: 280px mobile, 480px desktop.",
      "All ten required layers active.",
    ],
  },
  "collection-card": {
    id: "collection-card",
    name: "Collection Card",
    description:
      "Luxury product card illustration — compact Heritage Rendering for The Collection grid.",
    aspectRatio: "4 / 3",
    width: 640,
    height: 480,
    safeMargin: "4%",
    typography: {
      wordmark: false,
      taglinePrimary: false,
      taglineSecondary: false,
      title: true,
    },
    seal: { position: "bottom-right", size: "sm" },
    border: "compact",
    landscapeDensity: "moderate",
    contourDensity: "light",
    notes: [
      "Home name rendered in HTML below card — not inside SVG.",
      "Hover: subtle scale 1.02 on illustration.",
      "Contour density reduced to preserve legibility at small size.",
    ],
  },
  "project-book-cover": {
    id: "project-book-cover",
    name: "Project Book Cover",
    description:
      "Printed project archive cover — formal presentation for construction documentation binders.",
    aspectRatio: "3 / 4",
    width: 1200,
    height: 1600,
    safeMargin: "8%",
    typography: {
      wordmark: true,
      taglinePrimary: true,
      taglineSecondary: true,
      title: true,
    },
    seal: { position: "center-bottom", size: "lg" },
    border: "formal",
    landscapeDensity: "full",
    contourDensity: "full",
    notes: [
      "Print at 300 DPI: 4×6 in or 8.5×11 in crop.",
      "Title = home or residence name only — no addresses.",
      "Double-rule border with registration corners.",
    ],
  },
  "homeowner-presentation": {
    id: "homeowner-presentation",
    name: "Homeowner Presentation Print",
    description:
      "Framed presentation piece delivered at closeout — part of the Heritage Rendering archive.",
    aspectRatio: "5 / 4",
    width: 1500,
    height: 1200,
    safeMargin: "7%",
    typography: {
      wordmark: true,
      taglinePrimary: true,
      taglineSecondary: true,
      title: true,
    },
    seal: { position: "bottom-left", size: "lg" },
    border: "formal",
    landscapeDensity: "full",
    contourDensity: "full",
    notes: [
      "Landscape orientation for mantel and study display.",
      "Include residence name as presentation title.",
      "Suitable for 16×20 in or 18×24 in fine-art print.",
    ],
  },
  "social-media-post": {
    id: "social-media-post",
    name: "Social Media Post",
    description:
      "Square social asset — Instagram, LinkedIn, and brand channels.",
    aspectRatio: "1 / 1",
    width: 1080,
    height: 1080,
    safeMargin: "6%",
    typography: {
      wordmark: true,
      taglinePrimary: true,
      taglineSecondary: false,
    },
    seal: { position: "top-right", size: "sm" },
    border: "full",
    landscapeDensity: "moderate",
    contourDensity: "light",
    notes: [
      "Export at 1080×1080 px.",
      "Tagline secondary optional in caption — omitted in-artwork for clarity.",
      "4:5 variant: crop top/bottom or use dedicated story spec later.",
    ],
  },
  "jobsite-sign": {
    id: "jobsite-sign",
    name: "Jobsite Sign",
    description:
      "On-site identification — dignified field presence without addresses or parcel data.",
    aspectRatio: "3 / 2",
    width: 1800,
    height: 1200,
    safeMargin: "5%",
    typography: {
      wordmark: true,
      taglinePrimary: true,
      taglineSecondary: true,
      title: true,
    },
    seal: { position: "bottom-right", size: "md" },
    border: "minimal",
    landscapeDensity: "simplified",
    contourDensity: "light",
    notes: [
      "Print at 24×36 in or 36×48 in on weather-resistant substrate.",
      "No lot numbers, subdivision names, or street addresses.",
      "Residence name + wordmark only for project identification.",
      "Simplified elevation for distance legibility.",
    ],
  },
};

export function getTemplateSpec(id: HRTemplateId): HRTemplateSpec {
  return HR_TEMPLATE_SPECS[id];
}

export const HR_ALL_TEMPLATE_IDS = Object.keys(HR_TEMPLATE_SPECS) as HRTemplateId[];
