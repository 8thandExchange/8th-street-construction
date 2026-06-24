import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { LeadForm } from "@/components/forms/LeadForm";
import { SITE_IMAGES } from "@/lib/site-images";
import { BRAND, brandPhoneTel } from "@/lib/brand/assets";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — Discuss Your Project | 8th Street Construction",
  description:
    "Get in touch with 8th Street Construction in Augusta, GA. We respond to every inquiry within one business day.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader dark />
      <main className="bg-navy text-bone min-h-screen">
        <PageHero image={SITE_IMAGES.commercial} imageAlt={SITE_IMAGES.commercialAlt} className="pb-16 md:pb-24" texture="linen">
          <section className="pt-[calc(5.5rem+env(safe-area-inset-top))] md:pt-[calc(7rem+env(safe-area-inset-top))]">
            <Container size="wide">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
                <div className="lg:col-span-5">
                  <Reveal>
                    <span className="eyebrow-copper">Contact</span>
                  </Reveal>
                  <Reveal delay={100}>
                    <h1 className="mt-5 font-display text-display-xl leading-[0.95] text-bone max-w-[10ch]">
                      Tell us about your{" "}
                      <span className="italic-display text-copper-100">project.</span>
                    </h1>
                  </Reveal>
                  <Reveal delay={180}>
                    <p className="mt-6 md:mt-8 max-w-md text-base sm:text-lg text-bone/75 leading-relaxed">
                      Every inquiry gets a real reply from a real person. We respond within one business day.
                    </p>
                  </Reveal>

                  <div className="mt-10 md:mt-14 border-t border-bone/15 pt-8 md:pt-10 space-y-8">
                    <Reveal>
                      <div>
                        <div className="eyebrow text-bone/40 mb-2">Phone</div>
                        <a
                          href={`tel:${brandPhoneTel()}`}
                          className="font-display text-xl sm:text-2xl text-bone hover:text-copper-100 transition-colors"
                        >
                          {BRAND.phone}
                        </a>
                      </div>
                    </Reveal>
                    <Reveal delay={40}>
                      <div>
                        <div className="eyebrow text-bone/40 mb-2">Direct Email</div>
                        <a
                          href="mailto:hello@8thstreetconstruction.com"
                          className="font-display text-xl sm:text-2xl text-bone hover:text-copper-100 transition-colors break-all"
                        >
                          hello@8thstreetconstruction.com
                        </a>
                      </div>
                    </Reveal>
                    <Reveal delay={80}>
                      <div>
                        <div className="eyebrow text-bone/40 mb-2">Studio</div>
                        <div className="font-display text-xl sm:text-2xl text-bone leading-snug">
                          Augusta, Georgia
                          <br />
                          <span className="italic-display text-bone/60 text-lg">Serving the CSRA</span>
                        </div>
                      </div>
                    </Reveal>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <Reveal delay={120}>
                    <div className="surface-card-dark rounded-sm p-6 sm:p-8 md:p-12 lg:p-14">
                      <Suspense fallback={<div className="text-bone/40">Loading form…</div>}>
                        <LeadForm dark />
                      </Suspense>
                    </div>
                  </Reveal>
                </div>
              </div>
            </Container>
          </section>
        </PageHero>
      </main>
      <SiteFooter />
    </>
  );
}
