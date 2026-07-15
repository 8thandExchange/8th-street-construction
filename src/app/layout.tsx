import type { Metadata, Viewport } from "next";
// Self-hosted brand-guide fonts (no build-time Google Fonts dependency).
// Display/serif: Source Serif 4 · UI sans: DM Sans · Labels: Barlow Condensed · Data: JetBrains Mono
import "@fontsource-variable/source-serif-4";
import "@fontsource-variable/source-serif-4/wght-italic.css";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource/barlow-condensed/400.css";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "./globals.css";
import { LeadConnectorChat } from "@/components/site/LeadConnectorChat";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import { getSiteContact, contactTelHref } from "@/lib/site-contact";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://8thstreetconstruction.com";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.8thstreetconstruction.com"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "8th Street",
  },
  title: {
    default: "8th Street Construction — Custom Homes & Commercial Building | Augusta, GA",
    template: "%s · 8th Street Construction",
  },
  description:
    "Custom homes, residential renovations, and commercial construction in Augusta, Georgia and the CSRA. Built on craft, precision, and lasting quality. A division of 8th and Exchange Capital.",
  keywords: [
    "construction company Augusta GA",
    "custom home builder Augusta",
    "commercial construction Augusta Georgia",
    "residential construction CSRA",
    "general contractor Augusta",
    "design-build Augusta",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "8th Street Construction",
    title: "8th Street Construction — Custom Homes & Commercial Building",
    description:
      "Custom homes and commercial construction in Augusta, Georgia. Built on craft, precision, and lasting quality.",
  },
  twitter: {
    card: "summary_large_image",
    title: "8th Street Construction — Augusta, Georgia",
    description:
      "Custom homes and commercial construction rooted in craft, precision, and lasting quality.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2ece0" },
    { media: "(prefers-color-scheme: dark)", color: "#101c2a" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const contact = await getSiteContact();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "GeneralContractor",
    name: "8th Street Construction",
    alternateName: "8th Street Construction, a division of 8th and Exchange Capital",
    url: SITE_URL,
    email: contact.email,
    telephone: contactTelHref(contact.phone),
    image: `${SITE_URL}/opengraph-image`,
    description:
      "Custom homes, residential renovations, and commercial construction in Augusta, Georgia and the CSRA.",
    address: {
      "@type": "PostalAddress",
      addressLocality: contact.city.split(",")[0].trim(),
      addressRegion: "GA",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 33.4734978,
      longitude: -81.9748689,
    },
    areaServed: contact.serviceArea,
    parentOrganization: {
      "@type": "Organization",
      name: "8th and Exchange Capital",
    },
    knowsAbout: [
      "Custom Home Construction",
      "Commercial Construction",
      "Residential Renovation",
      "Design-Build",
      "Tenant Buildouts",
      "Historic Restoration",
    ],
  };

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <LeadConnectorChat />
        <PwaProvider />
      </body>
    </html>
  );
}
