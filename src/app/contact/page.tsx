import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { StockDisclaimer } from "@/components/site/StockDisclaimer";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { LeadForm } from "@/components/forms/LeadForm";
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
      <main className="bg-navy text-bone min-h-screen grain-overlay">
        <section className="pt-40 pb-20 md:pt-52 md:pb-32">
          <Container size="wide">
            <div className="grid grid-cols-12 gap-6 lg:gap-16">
              {/* Left column: heading + contact info */}
              <div className="col-span-12 lg:col-span-5">
                <Reveal>
                  <span className="eyebrow-copper">— Contact</span>
                </Reveal>
                <Reveal delay={100}>
                  <h1 className="mt-6 font-display text-display-xl leading-[0.95] text-bone">
                    Tell us<br/>about your<br/>
                    <span className="italic-display text-copper-100">project.</span>
                  </h1>
                </Reveal>
                <Reveal delay={200}>
                  <p className="mt-10 max-w-md text-lg text-bone/70 leading-relaxed">
                    Every inquiry gets a real reply from a real person. We read messages carefully and respond within one business day.
                  </p>
                </Reveal>

                <div className="mt-16 border-t border-bone/15 pt-12 space-y-10">
                  <Reveal>
                    <div>
                      <div className="eyebrow text-bone/40 mb-3">Direct Email</div>
                      <a
                        href="mailto:hello@8thstreetconstruction.com"
                        className="editorial-link font-display text-2xl text-bone hover:text-copper-100"
                      >
                        hello@8thstreetconstruction.com
                      </a>
                    </div>
                  </Reveal>
                  <Reveal delay={100}>
                    <div>
                      <div className="eyebrow text-bone/40 mb-3">Studio</div>
                      <div className="font-display text-2xl text-bone leading-snug">
                        Augusta, Georgia<br/>
                        <span className="italic-display text-bone/60">Serving the CSRA</span>
                      </div>
                    </div>
                  </Reveal>
                  <Reveal delay={200}>
                    <div>
                      <div className="eyebrow text-bone/40 mb-3">Response Time</div>
                      <div className="font-display text-2xl text-bone">
                        One business day<br/>
                        <span className="font-sans text-base text-bone/60">— guaranteed</span>
                      </div>
                    </div>
                  </Reveal>
                </div>
              </div>

              {/* Right column: form */}
              <div className="col-span-12 lg:col-span-7 lg:pl-8">
                <Reveal delay={150}>
                  <div className="border border-bone/15 p-8 md:p-12 lg:p-14 bg-navy/40">
                    <Suspense fallback={<div className="text-bone/40">Loading form…</div>}>
                      <LeadForm dark />
                    </Suspense>
                  </div>
                </Reveal>
              </div>
            </div>
          </Container>
        </section>
      </main>

        <div className="py-10 border-t border-bone/10 bg-navy">
          <StockDisclaimer />
        </div>

      <SiteFooter />
    </>
  );
}
