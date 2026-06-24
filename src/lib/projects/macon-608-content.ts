/** Public page copy and assets for The Oaks — founding chapter */

export const MACON_608_SLUG = "608-macon-ave";

export const MACON_608_MEDIA = {
  heroVideo: "/video/608-macon-animated.mp4",
  heroPoster: "/img/projects/608-macon-ave/twilight.png",
  twilight: "/img/projects/608-macon-ave/twilight.png",
  streetAngle: "/img/projects/608-macon-ave/street-angle.png",
  porchDetail: "/img/projects/608-macon-ave/porch-detail.png",
  cardImage: "/img/projects/608-macon-ave.png",
} as const;

export type Macon608Milestone = {
  title: string;
  when?: string;
  image?: string;
  imageAlt?: string;
};

export const MACON_608_TIMELINE_MILESTONES: Macon608Milestone[] = [
  { title: "Ground breaks", when: "June 26, 2026" },
  { title: "Foundation" },
  { title: "Framing" },
  { title: "Dry-in" },
  { title: "Finish" },
  { title: "Delivered" },
];

export const MACON_608_COPY = {
  eyebrow: "Flagship Project · Augusta, Georgia",
  title: "The Oaks",
  subhead: "A custom home, documented from the ground up.",
  statusLine: "Breaking ground, June 26, 2026 · Augusta, Georgia",
  metaDescription:
    "The Oaks — a custom home in Augusta, documented from the ground up by 8th Street Construction. Watch the build unfold milestone by milestone.",
  excerpt: "A custom home in Augusta, documented from the ground up.",
  story: {
    label: "The Story",
    heading: "The first chapter",
    paragraphs: [
      "The Oaks is where 8th Street Construction begins in public. A custom home in Augusta, designed before a single board is cut, and built in the open for anyone who wants to watch a house become a home.",
      "We are not showing you a finished product and asking you to imagine the work. We are showing you the work, from the cleared lot forward. The rendering on this page is the vision. Everything below it becomes a record, milestone by milestone, as The Oaks rises.",
      "Most builders show you one polished finished photo and hope you never ask what happened in between. We are doing the opposite. The slab, the framing, the dry-in, the finish. You will see all of it here.",
    ],
  },
  building: {
    label: "What We're Building",
    intro:
      "A three-bedroom, two-and-a-half-bath custom home composed for its street in Augusta. Southern proportion, honest materials, and a single accountable team from the first conversation to the day the keys change hands.",
    specs: [
      { label: "Bedrooms", value: "3" },
      { label: "Baths", value: "2.5" },
      { label: "Location", value: "Augusta, Georgia" },
      { label: "Status", value: "Breaking ground, June 26, 2026" },
      { label: "Builder", value: "8th Street Construction" },
    ],
  },
  timeline: {
    label: "The Build, Documented",
    intro: "This page updates as The Oaks rises. Site photos appear here as each milestone is completed.",
    milestones: MACON_608_TIMELINE_MILESTONES,
  },
  partnership: {
    label: "Part of the Work",
    body: "The Oaks is built in partnership with Habitat for Humanity CSRA. It is work we are proud of, and it is one part of what 8th Street builds across Augusta and the region. Custom homes, renovations, and commercial projects make up the rest. The standard is the same on every one.",
  },
  cta: {
    heading: "Want a home built like this?",
    body: "Start with a conversation. Tell us about your site and your timeline, and we will tell you honestly what it takes, including whether we are the right fit. We respond within one business day.",
  },
} as const;

export function isMacon608Slug(slug: string) {
  return slug === MACON_608_SLUG;
}
