import type { ProjectCategory, ProjectStatus } from "@/types/database";

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

/** Representative portfolio profiles — one per project category, Augusta / Low Country vernacular */
export const PORTFOLIO_EXAMPLES: PortfolioExample[] = [
  {
    slug: "608-macon-ave",
    title: "608 Macon Ave",
    subtitle: "Custom Low Country residence — new construction",
    category: "custom_home",
    status: "in_progress",
    excerpt:
      "A ground-up custom home in Augusta blending Low Country porch living with modern structural precision.",
    narrative: `608 Macon Ave is an active custom home build in Augusta — designed around the way families actually live in the CSRA climate.

The program calls for a raised Low Country foundation, a full-width front porch with classical column spacing, and a rear screened gathering space oriented for evening light. We are self-performing the structural shell and coordinating specialty trades through a single accountable team.

This project reflects our standard for custom residential work: detailed pre-construction planning, transparent milestone communication, and craft that is meant to endure Augusta summers and decades of family use.`,
    heroImage: "/img/projects/custom-home.png",
    location: "Augusta, GA",
    yearCompleted: null,
    squareFootage: 3200,
    budgetRange: null,
    featured: true,
    displayOrder: 1,
    metaDescription:
      "Custom Low Country home under construction in Augusta, GA by 8th Street Construction.",
  },
  {
    slug: "summerville-guest-house-renovation",
    title: "Summerville Guest House",
    subtitle: "Residential renovation — historic bungalow reinvention",
    category: "residential_renovation",
    status: "completed",
    excerpt:
      "A sensitive renovation of a 1920s Summerville bungalow — modern livability without losing Augusta character.",
    narrative: `This representative renovation profile reflects the work we do throughout Augusta's established neighborhoods — particularly the bungalow fabric of Summerville and the National Register districts nearby.

The scope included structural reinforcement of the original pier foundation, a reconfigured kitchen and primary suite, restored heart-pine floors, and new mechanical systems routed without compromising ceiling heights. Exterior work focused on porch restoration, shutter reproduction, and a restrained palette aligned with the street's historic rhythm.

Renovation in Augusta demands patience with existing conditions — out-of-plumb framing, layered finishes, and permitting through Richmond County. We document conditions early, price honestly, and protect the details that make these homes worth saving.`,
    heroImage: "/img/projects/residential-renovation.png",
    location: "Summerville, Augusta",
    yearCompleted: 2025,
    squareFootage: 2400,
    budgetRange: "$350K–$500K",
    featured: true,
    displayOrder: 2,
    metaDescription:
      "Historic bungalow renovation in Summerville, Augusta GA — residential renovation by 8th Street Construction.",
  },
  {
    slug: "washington-road-commercial",
    title: "Washington Road Commercial",
    subtitle: "Commercial new build — retail shell construction",
    category: "commercial_new_build",
    status: "completed",
    excerpt:
      "Ground-up commercial construction along Washington Road — cast-in-place structure built for CSRA retail tenancy.",
    narrative: `This commercial new build profile represents the ground-up work we deliver along Washington Road and similar CSRA corridors — where speed to certificate of occupancy and long-term durability both matter.

The structure is cast-in-place concrete with steel reinforcement, designed for flexible tenant layouts and high daily traffic. Our team managed sitework, utilities, shell completion, and inspection sequencing with Richmond County and Augusta engineering requirements.

Commercial clients choose 8th Street when they want a builder who understands local soils, ADA paths of travel, and the difference between a shell that merely passes inspection and one that tenants can build out without surprises.`,
    heroImage: "/img/projects/commercial-new-build.jpg",
    location: "Washington Rd, Augusta",
    yearCompleted: 2024,
    squareFootage: 8500,
    budgetRange: "$1.2M–$1.8M",
    featured: true,
    displayOrder: 3,
    metaDescription:
      "Commercial new construction on Washington Road, Augusta GA by 8th Street Construction.",
  },
  {
    slug: "broad-street-tenant-buildout",
    title: "Broad Street Buildout",
    subtitle: "Tenant buildout — downtown commercial finish",
    category: "tenant_buildout",
    status: "completed",
    excerpt:
      "A downtown Augusta tenant finish-out — from raw shell to branded hospitality space on schedule.",
    narrative: `Downtown Augusta tenant work requires coordination with landlords, historic district guidelines, and aggressive opening schedules. This buildout profile illustrates our tenant improvement approach: defined phases, after-hours work when needed, and finish quality that reads on camera and in person.

The scope covered MEP coordination, drywall and ceiling clouds, storefront glazing adjustments, polished concrete finishing, and a rust-accent feature wall tying the interior to the street's brick and iron palette. We interfaced directly with the tenant's design team while maintaining a single construction point of contact.

Whether restaurant, retail, or professional office, our buildouts are planned around inspection milestones and a clean handoff to operations.`,
    heroImage: "/img/projects/tenant-buildout.png",
    location: "Downtown Augusta",
    yearCompleted: 2025,
    squareFootage: 4200,
    budgetRange: "$400K–$600K",
    featured: false,
    displayOrder: 4,
    metaDescription:
      "Commercial tenant buildout in downtown Augusta GA by 8th Street Construction.",
  },
  {
    slug: "meadowbrook-design-build",
    title: "Meadowbrook Residence",
    subtitle: "Design-build — single-team delivery",
    category: "design_build",
    status: "completed",
    excerpt:
      "A design-build custom home in Evans — one contract, one team, from concept through certificate of occupancy.",
    narrative: `Design-build is the right model when owners want accountability without translating between an architect's drawings and a builder's field reality. This Meadowbrook-area profile reflects a Columbia County design-build delivery: we held both design coordination and construction execution.

Early phases integrated site constraints, Augusta-area wind and moisture considerations, and a Low Country porch volume into a cohesive set of working drawings. Construction followed with the same superintendent who helped shape the plan — reducing RFIs and keeping the owner's finish selections inside a realistic budget envelope.

For CSRA families comparing design-bid-build versus integrated delivery, this is the standard we bring: fewer handoffs, clearer pricing, and a finished home that matches the drawings on the wall.`,
    heroImage: "/img/projects/design-build.jpg",
    location: "Evans, GA",
    yearCompleted: 2024,
    squareFootage: 3800,
    budgetRange: "$750K–$1M",
    featured: false,
    displayOrder: 5,
    metaDescription:
      "Design-build custom home in Evans GA — 8th Street Construction single-team delivery.",
  },
  {
    slug: "greene-street-restoration",
    title: "Greene Street Restoration",
    subtitle: "Historic restoration — brick vernacular preservation",
    category: "historic_restoration",
    status: "completed",
    excerpt:
      "Exterior and structural restoration of a historic Augusta brick residence — mortar, porch, and chimney craft.",
    narrative: `Augusta's historic fabric — particularly the brick vernacular near Greene Street and the Summerville axis — rewards builders who understand lime mortar, soft-brick chemistry, and when to replicate rather than replace.

This restoration profile includes repointing with period-appropriate mortar mixes, structural sistering of floor framing, porch column and railing reconstruction to match existing profiles, and chimney rebuilding with flue liners sized for modern appliances while preserving the original silhouette.

Historic work is not renovation with older trim. It is a discipline of observation, documentation, and restraint. We partner with owners and reviewers to protect what is authentic while making the home safe, dry, and livable for another century.`,
    heroImage: "/img/projects/historic-restoration.png",
    location: "Greene St, Augusta",
    yearCompleted: 2023,
    squareFootage: 2900,
    budgetRange: "$500K–$750K",
    featured: false,
    displayOrder: 6,
    metaDescription:
      "Historic brick home restoration on Greene Street, Augusta GA by 8th Street Construction.",
  },
];

export const PORTFOLIO_IMAGE_BY_CATEGORY: Record<ProjectCategory, string> = {
  custom_home: "/img/projects/custom-home.png",
  residential_renovation: "/img/projects/residential-renovation.png",
  commercial_new_build: "/img/projects/commercial-new-build.jpg",
  tenant_buildout: "/img/projects/tenant-buildout.png",
  design_build: "/img/projects/design-build.jpg",
  historic_restoration: "/img/projects/historic-restoration.png",
};
