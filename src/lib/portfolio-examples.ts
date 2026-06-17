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
    subtitle: "Ground-up custom homes across the CSRA",
    excerpt:
      "Raised porches, classical proportion, and modern structural precision built for Augusta's climate.",
    narrative: `Our custom residential work includes raised Low Country foundations, deep front porches, durable envelope assemblies, and floor plans shaped around how families live in this region.

We self-perform critical path work where it matters and coordinate trades through a single accountable team — with detailed pre-construction planning and clear communication from first conversation through closeout.`,
    metaDescription:
      "Custom home construction in Augusta and the CSRA by 8th Street Construction.",
  },
  residential_renovation: {
    subtitle: "Renovations in Augusta's established neighborhoods",
    excerpt:
      "Sensitive updates that add modern livability while respecting neighborhood character.",
    narrative: `Typical renovation scopes include structural reinforcement, kitchen and primary suite reconfiguration, mechanical upgrades, porch restoration, and finish work that honors existing architecture.

We document conditions early, price honestly, and protect the details that make these homes worth saving.`,
    metaDescription:
      "Residential renovation in Augusta GA by 8th Street Construction.",
  },
  commercial_new_build: {
    subtitle: "Ground-up commercial construction",
    excerpt:
      "New commercial buildings built for durability, flexibility, and efficient certificate of occupancy.",
    narrative: `We deliver sitework, structural shells, utility coordination, and inspection sequencing aligned with local engineering and county requirements.

Our commercial work is planned for tenant flexibility, ADA compliance, and long-term performance under daily use.`,
    metaDescription:
      "Commercial new construction in Augusta GA by 8th Street Construction.",
  },
  tenant_buildout: {
    subtitle: "Commercial tenant finish-out",
    excerpt:
      "Interior buildouts from raw shell to move-in ready — retail, office, and hospitality.",
    narrative: `Scopes include MEP coordination, drywall and ceiling assemblies, storefront adjustments, floor finishes, and branded interior details coordinated with your design team.

We plan around inspections, landlord requirements, and opening schedules — with a single construction point of contact.`,
    metaDescription:
      "Commercial tenant buildout in Augusta GA by 8th Street Construction.",
  },
  design_build: {
    subtitle: "Single-team design and construction",
    excerpt:
      "Integrated design-build — one contract, one team, from concept through certificate of occupancy.",
    narrative: `Design-build keeps accountability in one place when owners do not want to translate between separate design and construction teams.

We coordinate drawings, specifications, permitting, and field execution under one roof — reducing handoffs and keeping finish selections inside a realistic budget.`,
    metaDescription:
      "Design-build construction in Augusta and the CSRA by 8th Street Construction.",
  },
  historic_restoration: {
    subtitle: "Historic preservation and restoration",
    excerpt:
      "Restoration that protects authentic fabric while making structures safe, dry, and livable.",
    narrative: `Restoration requires understanding lime mortar, soft-brick chemistry, period-appropriate profiles, and when to replicate rather than replace.

Typical scopes include repointing, structural sistering, porch reconstruction, and chimney repair that preserves original silhouettes.`,
    metaDescription:
      "Historic restoration in Augusta GA by 8th Street Construction.",
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
