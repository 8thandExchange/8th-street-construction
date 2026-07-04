import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";
import { GENERATED_IMAGERY } from "@/lib/generated-imagery";

/**
 * Full-bleed editorial pause — one image, one line. The Historical
 * Concepts moment: photography does the talking.
 */
export function HeirloomBand() {
  const img = GENERATED_IMAGERY.photoHeroBrickDusk;
  return (
    <section className="relative h-[70svh] min-h-[420px] overflow-hidden">
      <Image
        src={img.src}
        alt={img.alt}
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-navy/75 via-navy/20 to-navy/10" />
      <div className="absolute inset-0 flex items-end justify-center pb-14 md:pb-20 px-6">
        <Reveal>
          <p className="text-center font-display text-[clamp(1.5rem,4.5vw,2.75rem)] text-parchment leading-tight max-w-3xl [text-shadow:0_1px_24px_rgba(16,28,42,0.55)]">
            Built to be handed down.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
