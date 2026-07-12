import type { Metadata } from "next";
import Image from "next/image";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { StockDisclaimer } from "@/components/site/StockDisclaimer";
import { Reveal } from "@/components/ui/Reveal";
import { VolunteerSignup, type VolunteerEventCard } from "@/components/forms/VolunteerSignup";
import { createAnonymousClient } from "@/lib/supabase/anonymous";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Volunteer — Habitat for Humanity Build Days",
  description:
    "Join 8th Street Construction on a Habitat for Humanity build day in Augusta, GA. Build days are published well in advance — no experience needed, crew leads at every station.",
  alternates: { canonical: "/volunteer" },
};

export const revalidate = 300;

const IMG = "/img/projects";

const CADENCE = [
  {
    n: "01",
    title: "Published well in advance",
    body: "Every build day is posted here and shared with our Habitat affiliate at least four weeks out — most a full season ahead — so crews, churches, and companies can actually plan for it.",
  },
  {
    n: "02",
    title: "Details one week out",
    body: "Confirmed volunteers get the site address, parking, crew assignments, and weather plan by email one week before the build.",
  },
  {
    n: "03",
    title: "Reminder 48 hours before",
    body: "A final reminder with start time and checklist lands two days out. Can't make it? One reply frees your spot for the waitlist.",
  },
];

export default async function VolunteerPage() {
  const supabase = createAnonymousClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: events } = await supabase
    .from("volunteer_events")
    .select("*")
    .eq("published", true)
    .neq("status", "cancelled")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(12);

  // Confirmed-spot counts come via the service role — signups are not
  // publicly readable, only their aggregate matters here.
  let cards: VolunteerEventCard[] = [];
  if (events && events.length > 0) {
    const admin = createAdminClient();
    const { data: signups } = await admin
      .from("volunteer_signups")
      .select("event_id, group_size")
      .in("event_id", events.map((e) => e.id))
      .eq("status", "confirmed");

    const filled = new Map<string, number>();
    for (const s of signups ?? []) {
      filled.set(s.event_id, (filled.get(s.event_id) ?? 0) + (s.group_size ?? 1));
    }

    cards = events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      event_date: e.event_date,
      start_time: e.start_time,
      end_time: e.end_time,
      location: e.location,
      partner: e.partner,
      capacity: e.capacity,
      spots_left: Math.max(0, e.capacity - (filled.get(e.id) ?? 0)),
      skills_needed: e.skills_needed,
      what_to_bring: e.what_to_bring,
      signup_deadline: e.signup_deadline,
      status: e.status,
    }));
  }

  return (
    <>
      <SiteHeader />
      <main className="bg-navy text-bone">
        {/* Hero */}
        <section className="grain-overlay pt-16 md:pt-24 pb-16 md:pb-20">
          <div className="mx-auto max-w-8xl px-6 md:px-10 lg:px-14">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-end">
              <div>
                <span className="eyebrow-copper">— Volunteer · Habitat for Humanity</span>
                <h1 className="mt-4 font-display text-[clamp(2.5rem,5.5vw,4.5rem)] leading-[1.02] text-parchment">
                  Come build a home with <span className="italic text-copper">us</span>.
                </h1>
                <p className="mt-6 body-premium text-bone/65 max-w-xl">
                  Our first projects are Habitat for Humanity homes, and volunteer crews are how they
                  get built. Our licensed crew leads run every station — you don&apos;t need
                  experience, just closed-toe shoes and a Saturday.
                </p>
              </div>
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={`${IMG}/build-habitat-volunteer-hammering.jpg`}
                  alt="Volunteers building with Habitat for Humanity"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Communication cadence */}
        <section className="bg-navy-deep grain-overlay py-16 md:py-24 border-t border-bone/5">
          <div className="mx-auto max-w-8xl px-6 md:px-10 lg:px-14">
            <Reveal className="mb-12 md:mb-14">
              <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-copper mb-4">
                How scheduling works
              </p>
              <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.75rem)] max-w-2xl">
                A schedule you can plan your life around.
              </h2>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
              {CADENCE.map((c, i) => (
                <Reveal key={c.n} stagger={i} className="border-t border-copper/30 pt-6">
                  <span className="font-mono text-[11px] tracking-[0.2em] text-copper">{c.n}</span>
                  <h3 className="mt-3 font-sans text-lg font-medium text-bone">{c.title}</h3>
                  <p className="mt-3 body-premium text-bone/60 text-[15px]">{c.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Schedule + signup */}
        <section className="grain-overlay py-16 md:py-24 border-t border-bone/5">
          <div className="mx-auto max-w-8xl px-6 md:px-10 lg:px-14">
            <Reveal className="mb-10 md:mb-14">
              <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-copper mb-4">
                Upcoming build days
              </p>
              <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.75rem)]">
                The next {cards.length > 0 ? cards.length : ""} build day{cards.length === 1 ? "" : "s"} — on the calendar now.
              </h2>
            </Reveal>
            <VolunteerSignup events={cards} />
          </div>
        </section>

        {/* Group days CTA */}
        <section className="bg-navy-deep grain-overlay py-20 md:py-28 border-t border-copper/20">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <Reveal>
              <h2 className="font-display text-[clamp(1.75rem,4vw,3rem)] leading-tight mb-6">
                Bringing a company, church, or crew of ten-plus?
              </h2>
              <p className="body-premium text-bone/65 mb-8">
                We schedule private group build days with our Habitat partners — a dedicated crew
                lead, your own stations, and a date reserved months ahead.
              </p>
              <a
                href="mailto:hello@8thstreetconstruction.com?subject=Group%20build%20day"
                className="btn-copper-fill w-full md:w-[300px] mx-auto"
              >
                <span>Plan a Group Build Day →</span>
              </a>
            </Reveal>
          </div>
        </section>

        <div className="bg-navy py-10 border-t border-bone/10">
          <StockDisclaimer />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
