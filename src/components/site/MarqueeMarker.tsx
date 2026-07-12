import { cn } from "@/lib/utils";

const PHRASE = "BUILDING IN THE CSRA";

export function MarqueeMarker({ className }: { className?: string }) {
  const segment = `${PHRASE} · `;
  const repeated = segment.repeat(12);

  return (
    <div
      className={cn(
        "overflow-hidden border-y border-copper/25 bg-navy-deep py-5 md:py-6",
        className
      )}
      aria-hidden
    >
      <div className="flex w-max animate-marquee whitespace-nowrap">
        <span className="font-mono text-[11px] tracking-[0.28em] uppercase text-bone/35 px-4">
          {repeated}
        </span>
        <span className="font-mono text-[11px] tracking-[0.28em] uppercase text-bone/35 px-4">
          {repeated}
        </span>
      </div>
    </div>
  );
}
