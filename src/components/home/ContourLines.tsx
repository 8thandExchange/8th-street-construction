import { cn } from "@/lib/utils";

type ContourLinesProps = {
  className?: string;
  stroke?: string;
  opacity?: number;
};

/** Subtle topographic contour field — field journal aesthetic */
export function ContourLines({
  className,
  stroke = "currentColor",
  opacity = 0.08,
}: ContourLinesProps) {
  const ellipses = [
    { cx: 200, cy: 180, rx: 320, ry: 140 },
    { cx: 280, cy: 200, rx: 260, ry: 110 },
    { cx: 120, cy: 220, rx: 200, ry: 90 },
    { cx: 400, cy: 160, rx: 180, ry: 75 },
    { cx: 60, cy: 140, rx: 140, ry: 60 },
    { cx: 340, cy: 260, rx: 220, ry: 95 },
  ];

  return (
    <svg
      className={cn("absolute inset-0 h-full w-full pointer-events-none", className)}
      viewBox="0 0 800 400"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      {ellipses.map((e, i) => (
        <ellipse
          key={i}
          cx={e.cx}
          cy={e.cy}
          rx={e.rx}
          ry={e.ry}
          fill="none"
          stroke={stroke}
          strokeWidth="0.75"
          opacity={opacity}
        />
      ))}
      {[40, 80, 120, 160].map((y) => (
        <path
          key={y}
          d={`M0 ${y + 120} Q200 ${y + 100} 400 ${y + 130} T800 ${y + 115}`}
          fill="none"
          stroke={stroke}
          strokeWidth="0.5"
          opacity={opacity * 0.85}
        />
      ))}
    </svg>
  );
}
