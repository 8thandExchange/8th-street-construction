import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { StockDisclaimer } from "@/components/site/StockDisclaimer";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { BookingForm } from "@/components/forms/BookingForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Consultation | 8th Street Construction",
  description:
    "Schedule a consultation with 8th Street Construction. Phone, video, in-person, or on-site visits available across the CSRA.",
  alternates: { canonical: "/book" },
};

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "You request a time",
    body: "Tell us your preferred date, time window, and how you'd like to meet — phone, video, in-person, or on-site.",
  },
  {
    n: "02",
    title: "We confirm within a day",
    body: "A real person on our team confirms a specific time. If your preferred slot doesn't work, we'll propose alternatives.",
  },
  {
    n: "03",
    title: "We meet, listen, advise",
    body: "No sales pitch. We listen first, ask honest questions, and tell you what we'd recommend — including if we're not the right fit.",
  },
];

export default function BookPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-bone text-ink">
        <section className="pt-40 pb-20 md:pt-52 md:pb-24">
          <Container size="wide">
            <Reveal>
              <span className="section-num">— Consultation</span>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="mt-6 font-display text-display-2xl leading-[0.95] max-w-4xl">
                Book a<br/>
                <span className="italic-display text-copper">conversation.</span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-10 max-w-2xl text-lg text-ink/70 leading-relaxed">
                Phone, video, or in-person. No prep needed — show up with your questions and we'll bring honest answers.
              </p>
            </Reveal>
          </Container>
        </section>

        {/* How it works */}
        <section className="bg-paper py-16 md:py-20 rule-top rule-bottom">
          <Container size="wide">
            <Reveal className="mb-10">
              <span className="section-num">How it works</span>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">
              {HOW_IT_WORKS.map((s, i) => (
                <Reveal key={s.n} delay={i * 100}>
                  <div>
                    <div className="font-mono text-sm tracking-[0.15em] text-copper mb-4">{s.n}</div>
                    <h3 className="font-display text-2xl text-ink mb-3">{s.title}</h3>
                    <p className="text-base text-ink/70 leading-relaxed">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* Form */}
        <section className="py-20 md:py-32">
          <Container size="wide">
            <div className="grid grid-cols-12 gap-6 lg:gap-16">
              <div className="col-span-12 lg:col-span-4">
                <Reveal>
                  <span className="section-num">— Request a time</span>
                </Reveal>
                <Reveal delay={100}>
                  <h2 className="mt-6 font-display text-display-md leading-[1.05] text-ink">
                    Pick a window<br/>
                    <span className="italic-display text-copper">that works.</span>
                  </h2>
                </Reveal>
                <Reveal delay={200}>
                  <p className="mt-8 text-base text-ink/70 leading-relaxed">
                    Submit your preferred date and time window. We'll confirm a specific time within one business day.
                  </p>
                </Reveal>
              </div>
              <div className="col-span-12 lg:col-span-8">
                <Reveal delay={150}>
                  <div className="border border-ink/15 p-8 md:p-12 lg:p-14 bg-paper">
                    <BookingForm />
                  </div>
                </Reveal>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <div className="py-10 border-t border-ink/10 bg-bone">
        <StockDisclaimer />
      </div>
      <SiteFooter />
    </>
  );
}
