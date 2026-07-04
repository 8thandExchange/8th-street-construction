import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "8th Street Construction",
    short_name: "8th Street",
    description:
      "Your build, live — progress photos, schedule, messages, and payments from 8th Street Construction.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2ece0",
    theme_color: "#101c2a",
    icons: [
      { src: "/api/app-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/api/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/api/app-icon/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
