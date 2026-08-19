/**
 * Structured data for search engines and AI answer engines.
 *
 * Two audiences, one format. Search engines use this for rich results and
 * the knowledge panel; answer engines (ChatGPT, Perplexity, AI Overviews)
 * lean on it to decide what a page is actually about and what it can
 * safely quote. Both reward specificity, so these emit real values from
 * the database rather than generic boilerplate.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.8thstreetconstruction.com";

/**
 * Public social profiles. Google reads `sameAs` to tie the site to its
 * social accounts for the knowledge panel — an empty array is simply
 * omitted rather than emitted as a hollow claim.
 */
export const SOCIAL_PROFILES: string[] = [
  "https://www.facebook.com/8thstreetconstruction",
];

/** Hours the office answers the phone, for LocalBusiness rich results. */
export const OPENING_HOURS = [
  {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "08:00",
    closes: "17:00",
  },
] as const;

type ServiceRow = {
  slug: string;
  name: string;
  short_description: string | null;
  full_description?: string | null;
};

/** One Service node per published service, tied back to the contractor. */
export function serviceJsonLd(services: ServiceRow[], areaServed: string[]) {
  return services.map((s) => ({
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.name,
    description: s.short_description ?? s.full_description ?? undefined,
    serviceType: s.name,
    url: `${SITE_URL}/services#${s.slug}`,
    provider: {
      "@type": "GeneralContractor",
      name: "8th Street Construction",
      url: SITE_URL,
    },
    areaServed: areaServed.map((a) => ({ "@type": "City", name: a })),
  }));
}

/**
 * Breadcrumbs. Worth emitting even though the site shows no visual
 * breadcrumb trail: search results render the path in place of a raw URL,
 * and it tells a crawler how deep pages relate to the top level.
 */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}
