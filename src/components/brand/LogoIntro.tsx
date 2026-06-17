"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ElevationMarkAnimated } from "./ElevationMarkAnimated";

const STORAGE_KEY = "8sc-intro-seen";

export function LogoIntro() {
  const [phase, setPhase] = useState<"hidden" | "playing" | "exiting" | "done">("hidden");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = sessionStorage.getItem(STORAGE_KEY);

    if (reduced || seen) {
      setPhase("done");
      return;
    }

    sessionStorage.setItem(STORAGE_KEY, "1");
    setPhase("playing");

    const exitTimer = window.setTimeout(() => setPhase("exiting"), 3200);
    const doneTimer = window.setTimeout(() => setPhase("done"), 4000);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "hidden" || phase === "done") return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-navy text-parchment",
        phase === "exiting" && "logo-intro-exit"
      )}
      aria-hidden={phase === "exiting"}
    >
      <div className="logo-intro-content flex flex-col items-center px-6">
        <ElevationMarkAnimated className="h-28 w-28 sm:h-36 sm:w-36" animate />

        <div className="mt-10 sm:mt-12 flex flex-col items-center text-center logo-intro-wordmark">
          <span className="font-display font-semibold text-2xl sm:text-3xl tracking-[0.22em] uppercase">
            8TH STREET
          </span>
          <span className="font-sans text-[10px] sm:text-xs tracking-[0.42em] uppercase text-pencil mt-2">
            CONSTRUCTION
          </span>
          <span className="logo-intro-underline h-px w-48 sm:w-56 bg-rust mt-3" aria-hidden />
          <span className="font-display italic text-xs sm:text-sm tracking-[0.12em] text-pencil mt-3">
            Augusta, Georgia
          </span>
        </div>

        <p className="logo-intro-tagline mt-8 max-w-sm text-center font-display text-sm sm:text-base text-parchment/90 leading-snug">
          Building What Endures.
        </p>
        <p className="logo-intro-tagline mt-2 font-sans text-[10px] tracking-[0.22em] uppercase text-pencil/70">
          Crafted for Generations.
        </p>
      </div>
    </div>
  );
}
