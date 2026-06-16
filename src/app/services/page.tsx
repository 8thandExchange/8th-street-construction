import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { PageHero } from "@/components/site/PageHero";
import { BrandTexture } from "@/components/site/BrandTexture";
import { SITE_IMAGES } from "@/lib/site-images";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Services — Custom Homes, Commercial Construction & Renovations",
  description:
    "Full-service construction in Augusta, GA — custom homes, residential renovations, commercial new builds, tenant buildouts, pre-construction, and design-build.",
};

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("published", true)
    .order("display_order", { ascending: true });

  const SERVICE_IMAGES = [
    SITE_IMAGES.heroConstruction,
    SITE_IMAGES.craft,
    SITE_IMAGES.commercial,
    SITE_IMAGES.interior,
  ] as const;

  return (
    <>
      <SiteHeader dark />
      <main className="bg-bone text-ink">
        <PageHero
          image={SITE_IMAGES.heroConstruction}
          imageAlt={SITE_IMAGES.heroConstructionAlt}
          className="pb-12 md:pb-20"
          texture="blueprint"
        >
          <section className="pt-[calc(5.5rem+env(safe-area-inset-top))] md:pt-[calc(7rem+env(safe-area-inset-top))]">
            <Container size="wide">
              <Reveal>
                <span className="eyebrow-copper">— Services</span>
              </Reveal>
              <Reveal delay={100}>
                <h1 className="mt-6 font-display text-display-2xl leading-[0.95] text-bone max-w-3xl">
                  What we
                  <br />
                  <span className="italic-display text-copper-100">build.</span>
                </h1>
              </Reveal>
              <Reveal delay={200}>
                <p className="mt-10 max-w-2xl text-lg text-bone/75 leading-relaxed">
                  Full-service construction across residential and commercial — from feasibility studies through final walkthrough. One team, one standard, accountable end-to-end.
                </p>
              </Reveal>
            </Container>
          </section>
        </PageHero>

        {/* Service sections */}
        <section className="border-t border-ink/10">
          <Container size="wide" className="py-0">
            {(services ?? []).map((service, i) => (
              <Reveal key={service.slug}>
                <article
                  id={service.slug}
                  className="grid grid-cols-12 gap-6 lg:gap-12 py-16 md:py-24 border-b border-ink/10 last:border-b-0"
                >
                  <div className="col-span-12 lg:col-span-3">
                    <div className="md:sticky md:top-32 max-md:mb-4">
                      <span className="section-num">0{i + 1}</span>
                      <h2 className="mt-4 font-display text-display-md leading-[1.05]">
                        {service.name}
                      </h2>
                    </div>
                  </div>
                  <div className="col-span-12 lg:col-span-9 lg:max-w-2xl">
                    <div className="relative aspect-[16/10] overflow-hidden mb-8 md:mb-10 bg-paper">
                      <Image
                        src={SERVICE_IMAGES[i % SERVICE_IMAGES.length]}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        className="object-cover brand-photo"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy/40 via-transparent to-transparent" />
                    </div>
                    <p className="text-lg text-ink/85 leading-relaxed">
                      {service.short_description}
                    </p>
                    {service.full_description && (
                      <div className="mt-6 text-base text-ink/70 leading-relaxed whitespace-pre-wrap">
                        {service.full_description}
                      </div>
                    )}
                    <div className="mt-10">
                      <Link
                        href="/book"
                        className="inline-flex h-12 items-center px-6 border border-ink/30 hover:border-ink hover:bg-ink hover:text-bone font-mono text-[11px] tracking-[0.2em] uppercase transition-all duration-500"
                      >
                        Discuss This Service
                      </Link>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </Container>
        </section>

        {/* CTA */}
        <section className="bg-navy text-bone py-24 md:py-32 grain-overlay relative overflow-hidden">
          <BrandTexture kind="blueprint" opacity={0.2} />
          <Container size="wide">
            <div className="grid grid-cols-12 gap-6 items-end">
              <div className="col-span-12 md:col-span-8">
                <Reveal>
                  <h2 className="font-display text-display-xl leading-[0.95]">
                    Not sure which<br/>
                    <span className="italic-display text-copper-100">service</span> fits?
                  </h2>
                </Reveal>
                <Reveal delay={150}>
                  <p className="mt-8 max-w-xl text-lg text-bone/70 leading-relaxed">
                    Tell us about your project and we'll point you in the right direction — even if that means recommending someone else.
                  </p>
                </Reveal>
              </div>
              <div className="col-span-12 md:col-span-4">
                <Reveal delay={250}>
                  <Link
                    href="/book"
                    className="inline-flex w-full h-14 items-center justify-center bg-copper text-bone hover:bg-copper-400 font-mono text-xs tracking-[0.2em] uppercase transition-colors duration-500"
                  >
                    Book a Consultation
                  </Link>
                </Reveal>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
