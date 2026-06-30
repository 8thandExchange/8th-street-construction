/** @type {import('next').NextConfig} */
const nextConfig = {
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

export default nextConfig;
