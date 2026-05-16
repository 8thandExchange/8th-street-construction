"use client";
import { useEffect, useRef, type ComponentPropsWithRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RevealProps<T extends ElementType> {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: T;
}

export function Reveal<T extends ElementType = "div">({
  children,
  className,
  delay = 0,
  as,
}: RevealProps<T> & Omit<ComponentPropsWithRef<T>, keyof RevealProps<T> | "children">) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => el.classList.add("in"), delay);
            obs.unobserve(el);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <Tag ref={ref} className={cn("reveal", className)}>
      {children}
    </Tag>
  );
}
