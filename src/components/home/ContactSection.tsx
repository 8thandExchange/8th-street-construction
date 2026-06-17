import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { ContourLines } from "./ContourLines";
import { ContactForm } from "./ContactForm";

export function ContactSection() {
  return (
    <section id="contact" className="relative bg-navy text-parchment section-pad overflow-hidden">
      <ContourLines className="text-parchment" opacity={0.05} />

      <Container size="wide" className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-5">
            <Reveal>
              <span className="font-sans text-[11px] tracking-[0.28em] uppercase text-gold">Contact</span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-5 font-display text-display-xl text-parchment leading-[1.02]">
                Begin your project inquiry.
              </h2>
            </Reveal>
            <Reveal delay={160} className="mt-6">
              <p className="text-base text-parchment/70 leading-relaxed max-w-md">
                Share your vision for a custom residence in Augusta or the CSRA. We respond within one business day.
              </p>
            </Reveal>
            <Reveal delay={220} className="mt-10 hidden lg:block">
              <a
                href="mailto:construction@8thandexchange.com"
                className="font-sans text-sm text-gold hover:text-parchment transition-colors duration-300 editorial-link"
              >
                construction@8thandexchange.com
              </a>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal delay={120}>
              <div className="surface-card-dark rounded-sm p-6 sm:p-8 md:p-10 lg:p-12">
                <ContactForm />
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
