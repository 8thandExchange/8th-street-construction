export function ScrollIndicator() {
  return (
    <div
      className="absolute bottom-8 md:bottom-12 right-[clamp(2rem,6vw,8rem)] z-20 flex flex-col items-center gap-3"
      aria-hidden
    >
      <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-bone/50 [writing-mode:vertical-rl] rotate-180">
        Scroll
      </span>
      <span className="h-2 w-2 rounded-full bg-copper animate-copper-pulse" />
    </div>
  );
}
