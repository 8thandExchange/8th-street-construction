"use client";

import { cn } from "@/lib/utils";

type ElevationMarkAnimatedProps = {
  className?: string;
  stroke?: string;
  accent?: string;
  /** When true, runs the full draw-in sequence */
  animate?: boolean;
};

/**
 * Animated Elevation mark — baseline, ellipses, fulcrum, and T-mark draw in sequence.
 * Uses pathLength for reliable stroke animation across browsers.
 */
export function ElevationMarkAnimated({
  className,
  stroke = "#f2ece0",
  accent = "#b5451b",
  animate = true,
}: ElevationMarkAnimatedProps) {
  const draw = animate ? "mark-draw" : "";

  return (
    <svg
      viewBox="-36 -44 72 92"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <line
        x1="-30"
        y1="38"
        x2="30"
        y2="38"
        stroke={stroke}
        strokeWidth="1"
        pathLength="1"
        className={cn(draw, "mark-draw-baseline")}
      />
      <ellipse
        cx="0"
        cy="16"
        rx="19"
        ry="20"
        stroke={stroke}
        strokeWidth="2.5"
        pathLength="1"
        className={cn(draw, "mark-draw-ellipse-bottom")}
      />
      <ellipse
        cx="0"
        cy="-14"
        rx="16"
        ry="17"
        stroke={stroke}
        strokeWidth="2.5"
        pathLength="1"
        className={cn(draw, "mark-draw-ellipse-top")}
      />
      <polygon
        points="0,38 -4,45 4,45"
        fill={accent}
        className={cn(animate && "mark-fade-fulcrum")}
      />
      <line
        x1="0"
        y1="-35"
        x2="0"
        y2="-39"
        stroke={accent}
        strokeWidth="0.6"
        pathLength="1"
        className={cn(draw, "mark-draw-t-stem")}
      />
      <line
        x1="-3"
        y1="-39"
        x2="3"
        y2="-39"
        stroke={accent}
        strokeWidth="0.6"
        pathLength="1"
        className={cn(draw, "mark-draw-t-bar")}
      />
    </svg>
  );
}
