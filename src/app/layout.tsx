import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const sans = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://8thstreetconstruction.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
  alternates: { canonical: SITE_URL },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F1EA" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1620" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "GeneralContractor",
    name: "8th Street Construction",
    alternateName: "8th Street Construction, a division of 8th and Exchange Capital",
    url: SITE_URL,
    email: "construction@8thandexchange.com",
    image: `${SITE_URL}/img/og-default.jpg`,
    description:
      "Custom homes, residential renovations, and commercial construction in Augusta, Georgia and the CSRA.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Augusta",
      addressRegion: "GA",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 33.4734978,
      longitude: -81.9748689,
    },
    areaServed: [
      "Augusta", "Evans", "Martinez", "Grovetown",
      "North Augusta", "Columbia County", "Aiken",
    ],
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
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
