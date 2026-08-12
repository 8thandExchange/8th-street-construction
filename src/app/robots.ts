import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.8thstreetconstruction.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /print carries draw packets and schedules containing client
        // financial detail, reachable by id and never linked publicly.
        disallow: [
          "/admin",
          "/client",
          "/subs",
          "/api/",
          "/login",
          "/auth/",
          "/print",
          "/share/",
          "/vendor-form/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
