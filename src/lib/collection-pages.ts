import type { CollectionVariant } from "./home-collection";

export type CollectionHighlight = {
  title: string;
  body: string;
};

export type CollectionSpecs = {
  squareFeet: string;
  bedrooms: string;
  bathrooms: string;
  garage: string;
  outdoorLiving: string;
};

export type FloorPlanRoom = {
  id: string;
  label: string;
  /** SVG path d attribute */
  path: string;
  /** Optional sq ft label */
  area?: string;
};

export type CollectionPageData = {
  id: CollectionVariant;
  slug: string;
  name: string;
  description: string;
  detail: string;
  statement: string;
  story: string[];
  highlights: CollectionHighlight[];
  specs: CollectionSpecs;
  availability: {
    status: "available" | "by-commission";
    headline: string;
    body: string;
  };
  floorPlan: {
    label: string;
    rooms: FloorPlanRoom[];
  };
};

export const COLLECTION_PAGES: CollectionPageData[] = [
  {
    id: "augusta",
    slug: "the-augusta",
    name: "The Augusta",
    description: "A classical Low Country estate with deep porches and gracious symmetry.",
    detail: "Raised foundation · Full-width gallery · Hipped roof",
    statement:
      "A raised Low Country estate composed for Augusta’s tree-lined streets — deep galleries, hipped rooflines, and rooms that breathe with the Southern climate.",
    story: [
      "The Augusta draws from the grand vernacular of the Georgia Low Country — homes built to catch prevailing breezes, shelter long afternoons on the porch, and present a quiet face to the street while opening generously to garden and light within.",
      "We studied the proportion of historic Summerville and National Register districts: the rhythm of columns, the depth of overhang, the dignity of a symmetrical façade. Every line is intentional — not reproduction, but interpretation.",
      "Materials are chosen for how they age in Augusta’s heat and humidity: heart-pine where it matters, lime-washed brick where it softens, copper where rain will patina it beautifully over decades.",
    ],
    highlights: [
      {
        title: "Full-width gallery porch",
        body: "A continuous deep porch spanning the primary façade — the room that defines Southern living and connects interior to landscape.",
      },
      {
        title: "Raised foundation",
        body: "Elevated first floor for ventilation, flood resilience, and the classical proportion that distinguishes Low Country architecture.",
      },
      {
        title: "Hipped roof geometry",
        body: "A composed roofline with balanced eaves — designed for shade, drainage, and the silhouette Augusta neighborhoods expect.",
      },
      {
        title: "Central hall plan",
        body: "A traditional passage from entry to rear garden, flanked by formal and informal living spaces with clear sight lines.",
      },
      {
        title: "Heritage material palette",
        body: "Heart-pine flooring, lime-washed brick, and copper hardware — specified for patina, not perfection on day one.",
      },
    ],
    specs: {
      squareFeet: "4,200 – 5,800",
      bedrooms: "4 – 5",
      bathrooms: "4 – 5",
      garage: "2-car detached or porte-cochère",
      outdoorLiving: "Full-width porch, rear terrace, optional pool pavilion",
    },
    availability: {
      status: "by-commission",
      headline: "Available by commission",
      body: "The Augusta is adapted to your site, orientation, and program. No two are identical — each is composed for its place in Augusta.",
    },
    floorPlan: {
      label: "First Floor — Conceptual",
      rooms: [
        { id: "porch", label: "Gallery Porch", path: "M40 200 H440 V280 H40 Z", area: "480 SF" },
        { id: "entry", label: "Entry Hall", path: "M180 120 H300 V200 H180 Z", area: "120 SF" },
        { id: "living", label: "Living Room", path: "M40 80 H180 V200 H40 Z", area: "340 SF" },
        { id: "dining", label: "Dining Room", path: "M300 80 H440 V200 H300 Z", area: "320 SF" },
        { id: "kitchen", label: "Kitchen", path: "M180 40 H300 V120 H180 Z", area: "280 SF" },
        { id: "study", label: "Study", path: "M40 40 H180 V80 H40 Z", area: "140 SF" },
      ],
    },
  },
  {
    id: "savannah",
    slug: "the-savannah",
    name: "The Savannah",
    description: "Coastal Georgian proportion with ironwork rhythm and shaded loggias.",
    detail: "Double porch · Brick skirt · Fan-lit entries",
    statement:
      "Coastal Georgian proportion brought inland — double porches, fan-lit entries, and the shaded loggia as the heart of daily life.",
    story: [
      "The Savannah interprets the townhouses and doubles of Georgia’s coast for Augusta’s established neighborhoods. The double porch — one floor for arrival, one for living — creates vertical rhythm on the street while offering twice the shaded outdoor room.",
      "Fan-lit transoms above tall windows pull light deep into the plan without sacrificing privacy. We reference Savannah’s brick skirts and stucco upper stories, adapting the palette to local brickyards and craftspeople.",
      "Ironwork appears not as decoration but as shadow — balustrades and window guards that pattern afternoon light across interior floors.",
    ],
    highlights: [
      {
        title: "Double porch composition",
        body: "Stacked galleries with distinct functions — arrival below, living above — creating architectural presence on narrow lots.",
      },
      {
        title: "Fan-lit entries",
        body: "Elliptical transoms and sidelights that honor Georgian proportion while meeting modern energy standards behind traditional profiles.",
      },
      {
        title: "Brick skirt foundation",
        body: "A weighty brick base grounding lighter stucco or clapboard above — the coastal proportion Augusta infill demands.",
      },
      {
        title: "Ironwork shadow lines",
        body: "Custom balustrades and window guards designed as light filters, not applied ornament.",
      },
      {
        title: "Urban lot adaptability",
        body: "Composed for 50-foot and 60-foot lots common in historic Augusta districts.",
      },
    ],
    specs: {
      squareFeet: "3,400 – 4,600",
      bedrooms: "3 – 4",
      bathrooms: "3 – 4",
      garage: "1-car rear lane or carriage house",
      outdoorLiving: "Double porch, walled courtyard, roof terrace option",
    },
    availability: {
      status: "by-commission",
      headline: "Available by commission",
      body: "Ideal for historic districts and infill lots where vertical proportion and street presence matter.",
    },
    floorPlan: {
      label: "First Floor — Conceptual",
      rooms: [
        { id: "porch-lower", label: "Lower Porch", path: "M60 220 H420 V280 H60 Z", area: "360 SF" },
        { id: "foyer", label: "Foyer", path: "M200 140 H280 V220 H200 Z", area: "100 SF" },
        { id: "parlor", label: "Parlor", path: "M60 100 H200 V220 H60 Z", area: "280 SF" },
        { id: "family", label: "Family Room", path: "M280 100 H420 V220 H280 Z", area: "280 SF" },
        { id: "kitchen", label: "Kitchen", path: "M140 40 H340 V100 H140 Z", area: "320 SF" },
        { id: "courtyard", label: "Courtyard", path: "M340 40 H420 V100 H340 Z", area: "120 SF" },
      ],
    },
  },
  {
    id: "riverwalk",
    slug: "the-riverwalk",
    name: "The Riverwalk",
    description: "Contemporary riverfront living with glass, timber, and long sight lines.",
    detail: "Cantilevered roof · Screened gathering · Water orientation",
    statement:
      "Contemporary riverfront architecture — cantilevered roofs, timber structure, and rooms oriented to water, light, and the long horizon of the Savannah River.",
    story: [
      "The Riverwalk is our answer to sites along the Savannah River and its tributaries — places where the architecture must defer to the view without disappearing into glass cliché.",
      "Structure is expressed: heavy timber posts and beams, steel connectors visible and honest, roof planes that cantilever to shade without enclosing. The plan is linear, pulling you toward the water through a sequence of spaces that compress and release.",
      "Screened gathering rooms extend the season. Materials are regional — cypress, local stone, standing-seam metal — composed with the restraint of a modern architecture portfolio, not a vacation rental.",
    ],
    highlights: [
      {
        title: "Water-oriented linear plan",
        body: "A procession from entry to river edge — each room calibrated to a specific view and quality of light.",
      },
      {
        title: "Cantilevered roof planes",
        body: "Extended eaves and floating rooflines that shade glass walls and define outdoor rooms without heavy enclosure.",
      },
      {
        title: "Expressed timber structure",
        body: "Post-and-beam construction visible from within — craft you can read, not concealed behind drywall.",
      },
      {
        title: "Screened gathering pavilion",
        body: "A seasonal room between inside and out — protected from insects, open to breeze and river sound.",
      },
      {
        title: "Regional material honesty",
        body: "Cypress, local stone, and standing-seam metal — chosen for how they weather at the water’s edge.",
      },
      {
        title: "Energy-conscious glazing",
        body: "Large openings with modern performance — view without compromise to comfort or efficiency.",
      },
    ],
    specs: {
      squareFeet: "3,800 – 5,200",
      bedrooms: "3 – 4",
      bathrooms: "3 – 4",
      garage: "2-car integrated or detached studio",
      outdoorLiving: "River terrace, screened pavilion, dock integration",
    },
    availability: {
      status: "by-commission",
      headline: "Available by commission",
      body: "Designed for riverfront and view parcels across the CSRA. Site-specific orientation is essential.",
    },
    floorPlan: {
      label: "Main Level — Conceptual",
      rooms: [
        { id: "entry", label: "Entry", path: "M40 120 H120 V220 H40 Z", area: "80 SF" },
        { id: "great", label: "Great Room", path: "M120 80 H320 V220 H120 Z", area: "420 SF" },
        { id: "kitchen", label: "Kitchen", path: "M320 80 H440 V160 H320 Z", area: "200 SF" },
        { id: "screen", label: "Screened Pavilion", path: "M320 160 H440 V220 H320 Z", area: "120 SF" },
        { id: "primary", label: "Primary Suite", path: "M40 40 H200 V120 H40 Z", area: "280 SF" },
        { id: "terrace", label: "River Terrace", path: "M120 220 H440 V280 H120 Z", area: "380 SF" },
      ],
    },
  },
  {
    id: "summerville",
    slug: "the-summerville",
    name: "The Summerville",
    description: "A historic bungalow reimagined for modern family life in established Augusta.",
    detail: "Restored porch · Heart-pine floors · Quiet street presence",
    statement:
      "The Craftsman bungalow reimagined — low rooflines, deep eaves, and a porch that belongs on Summerville’s quiet, tree-canopied streets.",
    story: [
      "The Summerville honors Augusta’s bungalow neighborhoods without mimicking them. We studied the Craftsman plan: rooms that flow, built-ins that anchor daily life, a porch wide enough for a swing and a conversation.",
      "Rooflines stay low to respect street scale. Eaves extend far enough to shade summer windows. Inside, heart-pine floors and simple millwork recall the homes built here between 1910 and 1930 — updated for how families live now.",
      "This is restoration in spirit, not in letter — a new home that feels like it has always belonged on Summerville’s quiet, tree-canopied streets.",
    ],
    highlights: [
      {
        title: "Authentic street scale",
        body: "Low rooflines and horizontal massing that respect Summerville’s bungalow fabric and tree canopy.",
      },
      {
        title: "Deep eave overhangs",
        body: "Generous eaves shading windows and walls — functional craft that defines the Craftsman silhouette.",
      },
      {
        title: "Heart-pine flooring",
        body: "Wide-plank heart-pine throughout main living levels — material with history, specified for new construction.",
      },
      {
        title: "Built-in craftsmanship",
        body: "Window seats, bookcases, and mudroom storage integrated into the architecture, not added after.",
      },
      {
        title: "Modern family program",
        body: "Open gathering, private suites, and service spaces arranged for how Augusta families live today.",
      },
    ],
    specs: {
      squareFeet: "2,600 – 3,400",
      bedrooms: "3 – 4",
      bathrooms: "2 – 3",
      garage: "Detached 2-car carriage style",
      outdoorLiving: "Front porch, rear screened porch, garden terrace",
    },
    availability: {
      status: "by-commission",
      headline: "Available by commission",
      body: "Well suited to established Summerville lots and bungalow-scale infill throughout Augusta.",
    },
    floorPlan: {
      label: "First Floor — Conceptual",
      rooms: [
        { id: "porch", label: "Front Porch", path: "M80 200 H400 V260 H80 Z", area: "320 SF" },
        { id: "living", label: "Living Room", path: "M80 100 H240 V200 H80 Z", area: "240 SF" },
        { id: "dining", label: "Dining", path: "M240 100 H400 V160 H240 Z", area: "160 SF" },
        { id: "kitchen", label: "Kitchen", path: "M240 40 H400 V100 H240 Z", area: "160 SF" },
        { id: "bedroom", label: "Guest Suite", path: "M80 40 H240 V100 H80 Z", area: "160 SF" },
        { id: "mudroom", label: "Mudroom", path: "M400 160 H440 V260 H400 Z", area: "60 SF" },
      ],
    },
  },
  {
    id: "midtown",
    slug: "the-midtown",
    name: "The Midtown",
    description: "Urban infill elegance — refined scale, private courtyards, walkable Augusta.",
    detail: "Narrow lot · Courtyard plan · Limestone & brick",
    statement:
      "Urban infill for walkable Midtown — a courtyard plan that turns inward for privacy while holding a refined, limestone-and-brick street presence.",
    story: [
      "The Midtown addresses the narrow lots and walkable streets of Augusta’s urban core — places where the architecture must contribute to the sidewalk while sheltering private life within.",
      "The plan organizes around a central courtyard: light and air pulled into the center of the house, outdoor room accessible from multiple spaces, a fountain or garden as focal point.",
      "The street façade is composed and restrained — limestone trim, local brick, tall windows with deep reveals. Nothing shouts; everything holds.",
    ],
    highlights: [
      {
        title: "Courtyard-centered plan",
        body: "Rooms arranged around a private outdoor room — light, air, and garden at the heart of urban living.",
      },
      {
        title: "Narrow-lot optimization",
        body: "Composed for 40-foot and 50-foot urban lots without sacrificing program or natural light.",
      },
      {
        title: "Limestone and brick façade",
        body: "A material palette that ages gracefully on city streets — weight, texture, and permanence.",
      },
      {
        title: "Discreet parking",
        body: "Rear-lane or subgrade garage solutions that preserve streetscape character.",
      },
      {
        title: "Walkable neighborhood scale",
        body: "Proportion and detail calibrated for Midtown’s pedestrian streets and mixed-use context.",
      },
    ],
    specs: {
      squareFeet: "2,800 – 3,800",
      bedrooms: "3 – 4",
      bathrooms: "3 – 4",
      garage: "1-car rear or subgrade",
      outdoorLiving: "Central courtyard, roof garden option, terrace",
    },
    availability: {
      status: "by-commission",
      headline: "Available by commission",
      body: "Designed for urban infill and walkable Midtown parcels. Lot-specific adaptation required.",
    },
    floorPlan: {
      label: "Ground Floor — Conceptual",
      rooms: [
        { id: "entry", label: "Entry", path: "M180 200 H260 V280 H180 Z", area: "80 SF" },
        { id: "living", label: "Living", path: "M40 120 H180 V200 H40 Z", area: "200 SF" },
        { id: "kitchen", label: "Kitchen", path: "M260 120 H400 V200 H260 Z", area: "200 SF" },
        { id: "courtyard", label: "Courtyard", path: "M160 80 H280 V160 H160 Z", area: "160 SF" },
        { id: "dining", label: "Dining", path: "M40 40 H180 V120 H40 Z", area: "200 SF" },
        { id: "study", label: "Study", path: "M280 40 H400 V120 H280 Z", area: "160 SF" },
      ],
    },
  },
  {
    id: "broad",
    slug: "the-broad-street",
    name: "The Broad Street",
    description: "Downtown sophistication with layered façades and tailored interior volumes.",
    detail: "Townhome proportion · Elevated entry · Terrace living",
    statement:
      "Downtown townhome sophistication — layered façades, elevated entry, and terrace living above Broad Street’s urban energy.",
    story: [
      "The Broad Street is our urban townhouse — vertical living for Augusta’s downtown renaissance. The façade layers depth: base, middle, crown — each register with its own material and rhythm.",
      "Entry is elevated, creating a sense of arrival and privacy from the sidewalk. Living spaces occupy upper floors where light and views improve; terraces extend the interior outward.",
      "This is not a production townhome. It is a commissioned residence for those who want downtown walkability with the permanence of custom construction.",
    ],
    highlights: [
      {
        title: "Layered façade composition",
        body: "Base, middle, and crown registers — each with distinct material and proportion, creating depth on urban streets.",
      },
      {
        title: "Elevated entry sequence",
        body: "A measured arrival above street level — privacy, dignity, and separation from sidewalk energy.",
      },
      {
        title: "Upper-floor living",
        body: "Primary gathering spaces elevated for light, view, and acoustic distance from street activity.",
      },
      {
        title: "Terrace living",
        body: "Outdoor rooms on upper levels — morning coffee above the city, evening gatherings under open sky.",
      },
      {
        title: "Architectural stair",
        body: "The vertical circulation as a designed element — not a service core hidden from view.",
      },
    ],
    specs: {
      squareFeet: "3,200 – 4,400",
      bedrooms: "3 – 4",
      bathrooms: "3 – 4",
      garage: "Subgrade or rear-lane 2-car",
      outdoorLiving: "Roof terrace, Juliet balconies, rear patio",
    },
    availability: {
      status: "by-commission",
      headline: "Available by commission",
      body: "For downtown and urban corridor sites where vertical living and street presence converge.",
    },
    floorPlan: {
      label: "Second Floor — Conceptual",
      rooms: [
        { id: "living", label: "Living Room", path: "M40 80 H240 V200 H40 Z", area: "360 SF" },
        { id: "kitchen", label: "Kitchen", path: "M240 80 H400 V160 H240 Z", area: "240 SF" },
        { id: "dining", label: "Dining", path: "M240 160 H400 V200 H240 Z", area: "120 SF" },
        { id: "terrace", label: "Terrace", path: "M40 200 H240 V260 H40 Z", area: "200 SF" },
        { id: "primary", label: "Primary Suite", path: "M40 20 H200 V80 H40 Z", area: "240 SF" },
        { id: "study", label: "Study", path: "M240 20 H400 V80 H240 Z", area: "200 SF" },
      ],
    },
  },
];

export function getCollectionPage(slug: string): CollectionPageData | undefined {
  return COLLECTION_PAGES.find((p) => p.slug === slug);
}

export function getAllCollectionSlugs(): string[] {
  return COLLECTION_PAGES.map((p) => p.slug);
}

/** Card list derived from full page data */
export function getCollectionHomes() {
  return COLLECTION_PAGES.map(({ id, slug, name, description, detail }) => ({
    id,
    slug,
    name,
    description,
    detail,
  }));
}
