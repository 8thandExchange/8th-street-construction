"use client";

import { useEffect, useRef, useState } from "react";
import { LowCountryElevation } from "@/components/brand/LowCountryElevation";
import { cn } from "@/lib/utils";

type HeroArchitectureProps = {
  className?: string;
};

export function HeroArchitecture({ className }: HeroArchitectureProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setVisible(true);
      return;
    }

    const delay = sessionStorage.getItem("8sc-intro-seen") ? 400 : 4200;
    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-none absolute inset-y-0 right-0 w-[55%] max-w-2xl hidden lg:flex items-end justify-end pb-8 pr-4 md:pr-8 opacity-0 transition-opacity duration-[1.8s] ease-editorial",
        visible && "opacity-100",
        className
      )}
      aria-hidden
    >
      <div
        className={cn(
          "w-full max-w-md text-parchment/25 translate-y-4 transition-transform duration-[2s] ease-editorial",
          visible && "translate-y-0"
        )}
      >
        <LowCountryElevation stroke="currentColor" />
      </div>
    </div>
  );
}
