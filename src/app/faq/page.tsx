import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqJsonLd, breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { getSiteContact } from "@/lib/site-contact";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Questions About Building in Augusta, Answered",
  description:
    "What a custom home costs in Augusta, how long a build takes, how design-build works, and what areas 8th Street Construction serves.",
  alternates: { canonical: "/faq" },
};

/**
 * Answers are written to be quoted.
 *
 * Answer engines lift the first sentence, so every answer states the
 * substance immediately and saves the qualification for afterwards.
 * That is the opposite of how the rest of the site is written, and
 * deliberately so — brand voice belongs on the home page, and a direct
 * answer belongs here.
 *
 * DRAFT: every figure below needs Troy and Robby to confirm it before
 * this page goes near production.
 */
const FAQS: { question: string; answer: string }[] = [
  {
    question: "How much does it cost to build a custom home in Augusta, Georgia?",
    answer:
      "Most custom homes 8th Street Construction builds in the Augusta area run between $150 and $200 per square foot, depending on finish level, site conditions, and how much sitework a lot needs. A detailed cost plan is prepared before construction begins, broken down by trade, so the number is specific to the house rather than a rule of thumb.",
  },
  {
    question: "How long does it take to build a custom home?",
    answer:
      "A custom home in the Augusta area typically takes 9 to 12 months from groundbreaking to final walkthrough. Design and permitting usually add 2 to 4 months before that, so most clients should plan on about a year and a half from first conversation to move-in.",
  },
  {
    question: "What areas does 8th Street Construction serve?",
    answer:
      "8th Street Construction builds throughout Augusta and the CSRA, including Evans, Martinez, Grovetown, North Augusta, Columbia County, and Aiken.",
  },
  {
    question: "What is design-build, and why does it matter?",
    answer:
      "Design-build means one company is accountable for both the design and the construction of a project, instead of an architect and a builder holding separate contracts. It matters because it removes the gap where budget overruns usually appear: the people drawing the house are working against a real cost plan from the start.",
  },
  {
    question: "Does 8th Street Construction do commercial work as well as homes?",
    answer:
      "Yes. 8th Street Construction handles commercial construction and tenant buildouts alongside custom homes and residential renovations, across the Augusta and CSRA market.",
  },
  {
    question: "Do you work on historic homes and restorations?",
    answer:
      "Yes. Historic restoration is part of the work, which in Augusta often means matching original millwork and detailing while bringing systems up to current code.",
  },
  {
    question: "How do you handle changes once construction has started?",
    answer:
      "Changes are priced and approved as written change orders before the work happens. Each one is tied to the affected line of the project's cost plan, so the running budget reflects the change immediately rather than at the end.",
  },
  {
    question: "Can I see where my project stands while it is being built?",
    answer:
      "Yes. Every client gets a private portal showing the build schedule, progress photos, selections, invoices, and the current punch list, updated as the job moves.",
  },
];

export default async function FaqPage() {
  const contact = await getSiteContact();

  return (
    <>
      <JsonLd data={faqJsonLd(FAQS)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "FAQ", path: "/faq" },
        ])}
      />

      <SiteHeader dark />
      <main className="bg-bone text-ink">
        <section className="pt-[calc(7rem+env(safe-area-inset-top))] pb-16 md:pb-24 border-b border-ink/10">
          <Container size="wide">
            <Reveal>
              <span className="eyebrow-copper">— Common Questions</span>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="mt-6 font-display text-display-2xl leading-[0.95] max-w-3xl">
                Questions we get
                <br />
                <span className="italic-display text-copper">before the first nail.</span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-8 max-w-2xl text-lg text-ink/70 leading-relaxed">
                Straight answers about cost, timeline, and how we work in {contact.city}.
              </p>
            </Reveal>
          </Container>
        </section>

        <section className="py-16 md:py-24">
          <Container size="wide">
            <div className="max-w-3xl divide-y divide-ink/10">
              {FAQS.map((faq, i) => (
                <Reveal key={faq.question} delay={i * 40}>
                  <article className="py-8 first:pt-0">
                    <h2 className="font-display text-2xl md:text-3xl leading-tight">
                      {faq.question}
                    </h2>
                    <p className="mt-4 text-ink/75 leading-relaxed">{faq.answer}</p>
                  </article>
                </Reveal>
              ))}
            </div>

            <div className="mt-16 max-w-3xl border-t border-ink/15 pt-10">
              <h2 className="font-display text-2xl">Still deciding?</h2>
              <p className="mt-3 text-ink/70 leading-relaxed">
                A consultation is the fastest way to get a real number for your lot and your plans.
              </p>
              <Link href="/book" className="app-btn app-btn-accent mt-6 inline-flex">
                Book a consultation
              </Link>
            </div>
          </Container>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
