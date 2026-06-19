import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { HeritageRenderingShowcase } from "@/components/heritage-rendering/HeritageRenderingShowcase";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Heritage Rendering System",
  description:
    "The 8th Street Heritage Rendering System — design tokens, required layers, and template specifications.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/design-system/heritage-rendering" },
};

export default function HeritageRenderingSystemPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeritageRenderingShowcase />
      </main>
      <SiteFooter />
    </>
  );
}
