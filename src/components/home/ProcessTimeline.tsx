import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { PROCESS_STEPS } from "@/lib/home-collection";
import { BrandTexture } from "@/components/site/BrandTexture";

export function ProcessTimeline() {
  return (
    <section id="process" className="relative bg-parchment section-pad overflow-hidden">
      <BrandTexture kind="blueprint" opacity={0.1} />

      <Container size="wide" className="relative">
        <Reveal className="mb-12 md:mb-16 max-w-xl">
          <span className="eyebrow-copper">Our Process</span>
          <h2 className="mt-4 font-display text-display-xl text-ink leading-[1.02]">
            From first conversation to keys in hand.
          </h2>
        </Reveal>

        <div className="relative">
          <div
            className="hidden lg:block absolute top-[2.75rem] left-0 right-0 h-px bg-ink/10"
            aria-hidden
          />

          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {PROCESS_STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 90}>
                <li className="relative process-step">
                  <div className="flex items-center gap-4 mb-6">
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 bg-warm-white font-mono text-xs text-rust shrink-0 lg:relative lg:z-10"
                      aria-hidden
                    >
                      {step.n}
                    </span>
                    {i < PROCESS_STEPS.length - 1 && (
                      <span className="hidden sm:block lg:hidden flex-1 h-px bg-ink/10" aria-hidden />
                    )}
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl text-ink">{step.title}</h3>
                  <p className="mt-3 text-sm sm:text-[15px] text-ink/65 leading-relaxed">{step.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
