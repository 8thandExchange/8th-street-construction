"use client";
import { useEffect, useRef, type ComponentPropsWithRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RevealProps<T extends ElementType> {
  children: ReactNode;
  className?: string;
  /** Delay in ms before reveal triggers */
  delay?: number;
  /** Stagger index — multiplies by 70ms when used with stagger */
  stagger?: number;
  as?: T;
}

export function Reveal<T extends ElementType = "div">({
  children,
  className,
  delay = 0,
  stagger = 0,
  as,
}: RevealProps<T> & Omit<ComponentPropsWithRef<T>, keyof RevealProps<T> | "children">) {
  const totalDelay = delay + stagger * 70;
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => el.classList.add("in"), totalDelay);
            obs.unobserve(el);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [totalDelay]);

  return (
    <Tag ref={ref} className={cn("reveal", className)}>
      {children}
    </Tag>
  );
}
