import type { ProjectCategory, ProjectStatus } from "@/types/database";
import { PROJECT_CATEGORY_LABELS } from "@/lib/utils";

export type PortfolioExample = {
  slug: string;
  title: string;
  subtitle: string;
  category: ProjectCategory;
  status: ProjectStatus;
  excerpt: string;
  narrative: string;
  heroImage: string;
  location: string;
  yearCompleted: number | null;
  squareFootage: number | null;
  budgetRange: string | null;
  featured: boolean;
  displayOrder: number;
  metaDescription: string;
};

/** Slugs retired when we moved from fictional named projects to category illustrations */
export const RETIRED_PORTFOLIO_SLUGS = [
  "summerville-guest-house-renovation",
  "washington-road-commercial",
  "broad-street-tenant-buildout",
  "meadowbrook-design-build",
  "greene-street-restoration",
] as const;

export function isPortfolioIllustration(slug: string) {
  return slug.startsWith("example-");
}

export const PORTFOLIO_IMAGE_BY_CATEGORY: Record<ProjectCategory, string> = {
  custom_home: "/img/projects/custom-home.png",
  residential_renovation: "/img/projects/residential-renovation.png",
  commercial_new_build: "/img/projects/commercial-new-build.jpg",
  tenant_buildout: "/img/projects/tenant-buildout.png",
  design_build: "/img/projects/design-build.jpg",
  historic_restoration: "/img/projects/historic-restoration.png",
};

const categoryCopy: Record<
  ProjectCategory,
  { subtitle: string; excerpt: string; narrative: string; metaDescription: string }
> = {
  custom_home: {
    subtitle: "Low Country new construction — illustrative example",
    excerpt:
      "Ground-up custom homes across the CSRA — raised porches, classical proportion, and modern structural precision.",
    narrative: `This image illustrates the custom homes we build across Augusta and the CSRA — not a specific completed project.

Our custom residential work typically includes raised Low Country foundations, deep front porches, durable envelope assemblies, and floor plans shaped around how families live in this climate. We self-perform critical path work where it matters and coordinate trades through a single accountable team.

When you engage us for a custom home, you'll get detailed pre-construction planning, transparent milestone communication, and craft intended to endure for generations. Real project profiles will be added here as work is completed and photographed.`,
    metaDescription:
      "Custom home construction in Augusta and the CSRA — illustrative example by 8th Street Construction.",
  },
  residential_renovation: {
    subtitle: "Historic and established homes — illustrative example",
    excerpt:
      "Sensitive renovations that add modern livability while respecting Augusta neighborhood character.",
    narrative: `This image illustrates the residential renovation work we perform throughout Augusta's established neighborhoods — not a specific completed project.

Typical scopes include structural reinforcement, kitchen and primary suite reconfiguration, mechanical upgrades, porch restoration, and finish work that honors existing architecture. We document conditions early, price honestly, and protect the details that make these homes worth saving.

Renovation in the CSRA demands patience with existing conditions and familiarity with local permitting. Completed renovations will be published here as portfolio photography becomes available.`,
    metaDescription:
      "Residential renovation in Augusta GA — illustrative example by 8th Street Construction.",
  },
  commercial_new_build: {
    subtitle: "Ground-up commercial shell — illustrative example",
    excerpt:
      "New commercial construction built for durability, flexibility, and efficient certificate of occupancy.",
    narrative: `This image illustrates our ground-up commercial construction capabilities — not a specific completed project.

We deliver sitework, structural shells, utility coordination, and inspection sequencing aligned with local engineering and county requirements. Our commercial work is planned for tenant flexibility, ADA compliance, and long-term performance under daily use.

When your project is ready to break ground, we bring local soils knowledge and the discipline institutional clients expect. Real commercial profiles will replace illustrative examples as projects are completed.`,
    metaDescription:
      "Commercial new construction in Augusta GA — illustrative example by 8th Street Construction.",
  },
  tenant_buildout: {
    subtitle: "Commercial tenant finish-out — illustrative example",
    excerpt:
      "Interior buildouts from raw shell to move-in ready — retail, office, and hospitality spaces.",
    narrative: `This image illustrates the tenant improvement and buildout work we perform — not a specific completed project.

Scopes often include MEP coordination, drywall and ceiling assemblies, storefront adjustments, floor finishes, and branded interior details coordinated with your design team. We plan around inspection milestones, landlord requirements, and opening schedules.

Whether restaurant, retail, or professional office, our buildouts are executed with a single construction point of contact. Completed tenant projects will be added to this gallery over time.`,
    metaDescription:
      "Commercial tenant buildout in Augusta GA — illustrative example by 8th Street Construction.",
  },
  design_build: {
    subtitle: "Single-team design and construction — illustrative example",
    excerpt:
      "Integrated design-build delivery — one contract, one team, from concept through certificate of occupancy.",
    narrative: `This image illustrates our design-build approach — not a specific completed project.

Design-build is the right model when owners want accountability without translating between separate design and construction teams. We coordinate drawings, specifications, permitting, and field execution under one roof — reducing handoffs and keeping finish selections inside a realistic budget envelope.

For CSRA owners comparing delivery methods, we bring integrated planning and field discipline from day one. Published design-build case studies will appear here as projects are documented.`,
    metaDescription:
      "Design-build construction in Augusta and the CSRA — illustrative example by 8th Street Construction.",
  },
  historic_restoration: {
    subtitle: "Historic preservation and restoration — illustrative example",
    excerpt:
      "Restoration work that protects authentic fabric while making structures safe, dry, and livable.",
    narrative: `This image illustrates the historic restoration work we undertake in Augusta and the CSRA — not a specific completed project.

Restoration requires understanding lime mortar, soft-brick chemistry, period-appropriate profiles, and when to replicate rather than replace. Typical scopes include repointing, structural sistering, porch reconstruction, and chimney repair that preserves original silhouettes.

Historic work is a discipline of observation, documentation, and restraint. We partner with owners and reviewers to protect what is authentic. Documented restoration projects will be published here as they are completed.`,
    metaDescription:
      "Historic restoration in Augusta GA — illustrative example by 8th Street Construction.",
  },
};

const CATEGORY_ORDER: ProjectCategory[] = [
  "custom_home",
  "residential_renovation",
  "commercial_new_build",
  "tenant_buildout",
  "design_build",
  "historic_restoration",
];

/** Category illustrations — one image per service type, no fictional project names */
export const PORTFOLIO_EXAMPLES: PortfolioExample[] = CATEGORY_ORDER.map((category, index) => {
  const copy = categoryCopy[category];
  const label = PROJECT_CATEGORY_LABELS[category] ?? category;
  return {
    slug: `example-${category.replace(/_/g, "-")}`,
    title: label,
    subtitle: copy.subtitle,
    category,
    status: "completed",
    excerpt: copy.excerpt,
    narrative: copy.narrative,
    heroImage: PORTFOLIO_IMAGE_BY_CATEGORY[category],
    location: "Augusta · CSRA",
    yearCompleted: null,
    squareFootage: null,
    budgetRange: null,
    featured: index < 3,
    displayOrder: index + 1,
    metaDescription: copy.metaDescription,
  };
});
