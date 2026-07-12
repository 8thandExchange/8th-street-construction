import type { Metadata } from "next";
import Image from "next/image";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { createAnonymousClient } from "@/lib/supabase/anonymous";
import { getSiteContact } from "@/lib/site-contact";

export const metadata: Metadata = {
  title: "Volunteer — Habitat for Humanity Build Days | Augusta, GA",
  description:
    "Join 8th Street Construction on a Habitat for Humanity build day in Augusta, GA. Build days are published well in advance — no experience needed, crew leads at every station. Registration runs through Habitat.",
  alternates: { canonical: "/volunteer" },
};

export const revalidate = 300;

const CADENCE = [
  {
    n: "01",
    title: "Published well in advance",
    body: "Every build day is posted here and coordinated with our Habitat affiliate at least four weeks out — most a full season ahead — so crews, churches, and companies can actually plan for it.",
  },
  {
    n: "02",
    title: "Registered through Habitat",
    body: "Habitat for Humanity runs volunteer registration — waivers, age rules, and crew rosters — through their own system. Every build day here links you straight to the right signup.",
  },
  {
    n: "03",
    title: "Led by our crew leads",
    body: "On site, 8th Street's licensed crew leads run every station. You don't need experience — you need closed-toe shoes, a water bottle, and a Saturday.",
  },
];

function fmtTime(t: string) {
  const [h, m] = String(t).split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return m ? `${hr}:${String(m).padStart(2, "0")} ${ampm}` : `${hr} ${ampm}`;
}

function fmtShortDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default async function VolunteerPage() {
  const supabase = createAnonymousClient();
  const contact = await getSiteContact();
  const today = new Date().toISOString().slice(0, 10);

  const { data: events } = await supabase
    .from("volunteer_events")
    .select(
      "id, title, description, partner, location, event_date, start_time, end_time, capacity, signup_deadline, skills_needed, status, external_signup_url"
    )
    .eq("published", true)
    .neq("status", "cancelled")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(12);

  const volunteerMailto = `mailto:${contact.email}?subject=${encodeURIComponent(
    "Volunteer build day"
  )}`;

  return (
    <>
      <SiteHeader />
      <main className="bg-navy text-bone">
        {/* Hero */}
        <section className="pt-[calc(5.5rem+env(safe-area-inset-top))] pb-14 md:pt-[calc(7rem+env(safe-area-inset-top))] md:pb-20 grain-overlay">
          <Container size="wide">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-end">
              <div>
                <Reveal>
                  <span className="section-num">— Volunteer · Habitat for Humanity</span>
                </Reveal>
                <Reveal delay={100}>
                  <h1 className="mt-6 font-display text-display-2xl leading-[0.95]">
                    Come build<br />
                    a home <span className="italic-display text-copper">with us</span>.
                  </h1>
                </Reveal>
                <Reveal delay={200}>
                  <p className="mt-8 max-w-xl text-lg text-bone/70 leading-relaxed">
                    Our first projects are Habitat for Humanity homes, and volunteer crews are how
                    they get built. The schedule below is published far in advance — pick a
                    Saturday, register with Habitat, and we&apos;ll see you on site.
                  </p>
                </Reveal>
              </div>
              <Reveal delay={150} className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src="/img/projects/build-habitat-volunteer-hammering.jpg"
                  alt="Volunteer hammering framing on a Habitat for Humanity build"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover brand-photo"
                />
              </Reveal>
            </div>
          </Container>
        </section>

        {/* How it works */}
        <section className="bg-navy-deep py-16 md:py-24 border-t border-bone/5 grain-overlay">
          <Container size="wide">
            <Reveal className="mb-12 md:mb-14">
              <span className="section-num">How it works</span>
              <h2 className="mt-6 font-display text-display-md leading-[1.02] max-w-2xl">
                A schedule you can plan your life around.
              </h2>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
              {CADENCE.map((c, i) => (
                <Reveal key={c.n} delay={i * 100} className="border-t border-copper/30 pt-6">
                  <span className="font-mono text-[11px] tracking-[0.2em] text-copper">{c.n}</span>
                  <h3 className="mt-3 font-sans text-lg font-medium text-bone">{c.title}</h3>
                  <p className="mt-3 text-[15px] text-bone/60 leading-relaxed">{c.body}</p>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>

        {/* Schedule */}
        <section className="py-16 md:py-24 border-t border-bone/5 grain-overlay">
          <Container size="wide">
            <Reveal className="mb-10 md:mb-14">
              <span className="section-num">Upcoming build days</span>
              <h2 className="mt-6 font-display text-display-md leading-[1.02]">
                On the calendar <span className="italic-display text-copper">now</span>.
              </h2>
            </Reveal>

            {events && events.length > 0 ? (
              <div className="border-t border-bone/15">
                {events.map((e, i) => {
                  const isFull = e.status === "full";
                  const closed =
                    e.signup_deadline !== null && e.signup_deadline < today;
                  const registerHref = e.external_signup_url || volunteerMailto;
                  return (
                    <Reveal
                      key={e.id}
                      delay={Math.min(i * 80, 240)}
                      className="grid grid-cols-1 md:grid-cols-[150px_1fr_auto] gap-6 md:gap-10 items-start py-8 md:py-10 border-b border-bone/15"
                    >
                      <div>
                        <div className="font-display text-5xl text-parchment leading-none">
                          {fmtShortDate(e.event_date).split(" ")[1]}
                        </div>
                        <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-copper mt-2">
                          {new Date(`${e.event_date}T00:00:00`).toLocaleDateString("en-US", {
                            month: "long",
                          })}{" "}
                          ·{" "}
                          {new Date(`${e.event_date}T00:00:00`).toLocaleDateString("en-US", {
                            weekday: "short",
                          })}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-display text-2xl md:text-[1.75rem] text-bone leading-snug">
                          {e.title}
                        </h3>
                        {e.description && (
                          <p className="mt-2 text-sm text-bone/60 max-w-xl leading-relaxed">
                            {e.description}
                          </p>
                        )}
                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 font-mono text-[10px] tracking-[0.16em] uppercase text-bone/45">
                          <span>
                            {fmtTime(e.start_time)} – {fmtTime(e.end_time)}
                          </span>
                          {e.location && <span>{e.location}</span>}
                          <span>Crew of {e.capacity}</span>
                          {e.skills_needed && (
                            <span className="text-copper/80">{e.skills_needed}</span>
                          )}
                        </div>
                        {e.signup_deadline && !closed && (
                          <p className="mt-2 font-mono text-[10px] tracking-[0.16em] uppercase text-bone/35">
                            Registration closes {fmtShortDate(e.signup_deadline)}
                          </p>
                        )}
                      </div>

                      <div className="flex md:flex-col items-center md:items-end gap-4 md:gap-3">
                        {(isFull || closed) && (
                          <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-amber-500">
                            {closed ? "Registration closed" : "Day is full"}
                          </span>
                        )}
                        {!closed && (
                          <a
                            href={registerHref}
                            target={e.external_signup_url ? "_blank" : undefined}
                            rel={e.external_signup_url ? "noopener noreferrer" : undefined}
                            className="h-11 px-6 inline-flex items-center font-mono text-[10px] tracking-[0.2em] uppercase transition-colors border border-bone/25 text-bone/80 hover:border-copper hover:text-copper"
                          >
                            {isFull ? "Join Habitat's Waitlist" : "Register with Habitat →"}
                          </a>
                        )}
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            ) : (
              <div className="border border-bone/15 p-10 text-center">
                <p className="font-display text-2xl text-bone mb-3">
                  The next build-day schedule is being finalized with Habitat.
                </p>
                <p className="text-bone/60 text-sm max-w-md mx-auto">
                  We publish build days at least a month in advance. Email{" "}
                  <a href={volunteerMailto} className="text-copper hover:text-copper-glow">
                    {contact.email}
                  </a>{" "}
                  and we&apos;ll let you know the moment the next schedule posts.
                </p>
              </div>
            )}

            <p className="mt-8 text-xs text-bone/40 max-w-2xl leading-relaxed">
              Volunteer registration, waivers, and day-of rosters are managed by Habitat for
              Humanity. Registering through their link above confirms your spot; we handle the
              building.
            </p>
          </Container>
        </section>

        {/* Second photo + group CTA */}
        <section className="bg-navy-deep py-16 md:py-24 border-t border-copper/20 grain-overlay">
          <Container size="wide">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <Reveal className="relative aspect-[4/3] overflow-hidden order-2 lg:order-1">
                <Image
                  src="/img/projects/build-women-wall-framing.jpg"
                  alt="Volunteer crew raising a framed wall on a community build"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover brand-photo"
                />
              </Reveal>
              <div className="order-1 lg:order-2">
                <Reveal>
                  <h2 className="font-display text-display-md leading-[1.02] mb-6">
                    Bringing a company, church, or crew of{" "}
                    <span className="italic-display text-copper">ten-plus</span>?
                  </h2>
                  <p className="text-bone/65 leading-relaxed mb-8 max-w-lg">
                    We coordinate private group build days with our Habitat partners — a dedicated
                    crew lead, your own stations, and a date reserved months ahead.
                  </p>
                  <a
                    href={`mailto:${contact.email}?subject=${encodeURIComponent("Group build day")}`}
                    className="inline-flex h-14 items-center justify-center px-10 bg-copper text-bone hover:bg-copper-400 font-mono text-xs tracking-[0.2em] uppercase transition-colors duration-500"
                  >
                    Plan a Group Build Day →
                  </a>
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
