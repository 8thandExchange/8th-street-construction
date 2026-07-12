export function HeroStat() {
  return (
    <div className="absolute top-[clamp(6rem,14vh,10rem)] right-[clamp(2rem,6vw,8rem)] z-20 text-right">
      <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-bone/45">01</p>
      <p className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-none text-bone mt-1">
        12
      </p>
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-copper mt-2 max-w-[10ch] ml-auto">
        Homes Underway
      </p>
    </div>
  );
}
