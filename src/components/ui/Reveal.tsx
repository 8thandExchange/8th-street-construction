"use client";
import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  type ComponentPropsWithRef,
  type ElementType,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type RevealDirection = "up" | "left" | "right" | "scale" | "blur";

const DIRECTION_CLASS: Record<RevealDirection, string> = {
  up: "reveal-up",
  left: "reveal-left",
  right: "reveal-right",
  scale: "reveal-scale",
  blur: "reveal-blur",
};

interface RevealProps<T extends ElementType> {
  children: ReactNode;
  className?: string;
  /** Delay before the reveal triggers, in ms. */
  delay?: number;
  /** Entrance direction. Defaults to a gentle upward rise. */
  direction?: RevealDirection;
  as?: T;
}

export function Reveal<T extends ElementType = "div">({
  children,
  className,
  delay = 0,
  direction = "up",
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
    <Tag ref={ref} className={cn("reveal", DIRECTION_CLASS[direction], className)}>
      {children}
    </Tag>
  );
}

interface RevealGroupProps {
  children: ReactNode;
  className?: string;
  /** Time between each child's entrance, in ms. */
  stagger?: number;
  /** Delay before the first child reveals, in ms. */
  delay?: number;
  /** Entrance direction applied to every child. */
  direction?: RevealDirection;
}

/**
 * Reveals a set of sibling elements in sequence. Each direct child is wrapped
 * in a Reveal with an incrementing delay, so motion cascades rather than
 * firing all at once — the MotionSites "staggered choreography" principle.
 */
export function RevealGroup({
  children,
  className,
  stagger = 70,
  delay = 0,
  direction = "up",
}: RevealGroupProps) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement[];

  return (
    <>
      {items.map((child, i) => (
        <Reveal
          key={child.key ?? i}
          delay={delay + i * stagger}
          direction={direction}
          className={className}
        >
          {child}
        </Reveal>
      ))}
    </>
  );
}
