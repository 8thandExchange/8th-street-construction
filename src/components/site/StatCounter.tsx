"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type StatCounterProps = {
  value: string;
  className?: string;
};

/** Parses "25+", "100%", "0", "1" into animatable numeric display */
function parseStat(value: string): { num: number; suffix: string } {
  const match = value.match(/^(\d+)(.*)$/);
  if (!match) return { num: 0, suffix: value };
  return { num: Number(match[1]), suffix: match[2] ?? "" };
}

export function StatCounter({ value, className }: StatCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const { num, suffix } = parseStat(value);
  const [display, setDisplay] = useState(num === 0 ? "0" : "0");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(String(num));
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [num]);

  useEffect(() => {
    if (!started) return;

    const duration = 1200;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(String(Math.round(num * eased)));
      if (t < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [started, num]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {display}
      {suffix}
    </span>
  );
}
