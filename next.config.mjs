import { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "next/constants.js";

/** @type {import('next').NextConfig} */
const baseConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "8thstreetconstruction.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        // Brand imagery generated via the company Higgsfield account
        protocol: "https",
        hostname: "d8j0ntlcm91z4.cloudfront.net",
        pathname: "/user_3FKaDTe0AKMeUNUmiqtjxEQGLrP/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/invoicing/:path*",
        destination: "/admin/invoicing",
        permanent: false,
      },
      {
        source: "/pay/invoice/:path*",
        destination: "/admin/invoicing",
        permanent: false,
      },
    ];
  },
};

export default function config(phase) {
  // Local `next build` writes to .next-build so it can never collide with
  // the dev server's .next. A build run beside `next dev` corrupted dev's
  // persistent cache in 8th-exchange-media (2026-08-19, stale CSS until
  // .next was deleted). Vercel sets VERCEL=1 and keeps the default .next.
  const isLocalProd =
    !process.env.VERCEL &&
    (phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER);
  return { ...baseConfig, distDir: isLocalProd ? ".next-build" : ".next" };
}
