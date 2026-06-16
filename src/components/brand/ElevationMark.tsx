import { cn } from "@/lib/utils";

type ElevationMarkProps = {
  className?: string;
  /** Stroke color for circles and baseline */
  stroke?: string;
  /** Accent color for T-mark and fulcrum triangle */
  accent?: string;
};

/**
 * Elevation mark — figure-8 with survey T and fulcrum triangle.
 * Paths from brand lockup (viewBox centered at mark origin).
 */
export function ElevationMark({
  className,
  stroke = "currentColor",
  accent = "#b5451b",
}: ElevationMarkProps) {
  return (
    <svg
      viewBox="-36 -44 72 92"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <ellipse cx="0" cy="-14" rx="16" ry="17" stroke={stroke} strokeWidth="2.5" />
      <ellipse cx="0" cy="16" rx="19" ry="20" stroke={stroke} strokeWidth="2.5" />
      <line x1="-30" y1="38" x2="30" y2="38" stroke={stroke} strokeWidth="1" />
      <polygon points="0,38 -4,45 4,45" fill={accent} />
      <line x1="0" y1="-35" x2="0" y2="-39" stroke={accent} strokeWidth="0.6" />
      <line x1="-3" y1="-39" x2="3" y2="-39" stroke={accent} strokeWidth="0.6" />
    </svg>
  );
}
