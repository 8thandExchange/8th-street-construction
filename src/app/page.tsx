import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { LogoIntro } from "@/components/brand/LogoIntro";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedProjectSection } from "@/components/home/FeaturedProjectSection";
import { CollectionSection } from "@/components/home/CollectionSection";
import { ProcessTimeline } from "@/components/home/ProcessTimeline";
import { HeritageRenderingSystemSection } from "@/components/home/HeritageRenderingSystemSection";
import { AboutSection } from "@/components/home/AboutSection";
import { ContactSection } from "@/components/home/ContactSection";

export const revalidate = 3600;

export default function HomePage() {
  return (
    <>
      <LogoIntro />
      <SiteHeader dark />
      <main className="bg-warm-white text-ink">
        <HeroSection />
        <FeaturedProjectSection />
        <CollectionSection />
        <ProcessTimeline />
        <HeritageRenderingSystemSection />
        <AboutSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </>
  );
}
