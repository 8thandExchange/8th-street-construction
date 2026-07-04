import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { BrandTexture } from "@/components/site/BrandTexture";
import { GENERATED_IMAGERY } from "@/lib/generated-imagery";

const PROMISES = [
  {
    title: "Every day, documented",
    body: "Progress photos and field notes from your jobsite, posted as work happens — not when you ask.",
  },
  {
    title: "Your schedule, live",
    body: "A real build timeline showing every phase, what's underway, and the days remaining to completion.",
  },
  {
    title: "Decisions from anywhere",
    body: "Approve selections, sign off on plans, review change orders, and pay securely — all from your phone.",
  },
] as const;

/**
 * The differentiator: every 8th Street client gets a private portal —
 * an installable app with live progress, messaging, and payments.
 */
export function PortalPromiseSection() {
  const img = GENERATED_IMAGERY.wcPorchVignette;
  return (
    <section className="relative bg-navy text-parchment section-pad overflow-hidden">
      <BrandTexture kind="linen" opacity={0.08} />
      <Container size="wide" className="relative">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20 items-center">
          <div>
            <Reveal>
              <span className="eyebrow-copper">The 8th Street Portal</span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 font-display text-display-lg leading-[1.05]">
                Watch your home get built — from your phone.
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <p className="mt-5 text-parchment/70 leading-relaxed max-w-lg">
                Every client receives a private portal the day their project begins. No
                wondering, no waiting for a call back — your build, in your pocket.
              </p>
            </Reveal>

            <div className="mt-10 space-y-7">
              {PROMISES.map((p, i) => (
                <Reveal key={p.title} delay={200 + i * 80}>
                  <div className="border-l border-copper/60 pl-5">
                    <h3 className="font-display text-lg text-parchment">{p.title}</h3>
                    <p className="mt-1.5 text-sm text-parchment/65 leading-relaxed max-w-md">
                      {p.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={480} className="mt-10">
              <Link
                href="/contact"
                className="cta-lift inline-flex h-12 items-center justify-center px-8 bg-rust text-parchment hover:bg-rust-200 font-sans text-[11px] tracking-[0.22em] uppercase"
              >
                Start a conversation
              </Link>
            </Reveal>
          </div>

          <Reveal delay={160} className="relative">
            <div className="relative mx-auto max-w-sm lg:max-w-md">
              <div className="relative aspect-[4/5] overflow-hidden border border-parchment/15 bg-parchment">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="(max-width: 1024px) 90vw, 440px"
                  className="object-cover"
                />
              </div>
              <p className="mt-3 text-center text-[10px] font-mono uppercase tracking-[0.18em] text-parchment/40">
                Heritage rendering · The porch, before it exists
              </p>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
