import { cn } from "@/lib/utils";

type LowCountryElevationProps = {
  className?: string;
  stroke?: string;
  accent?: string;
};

/**
 * Architectural elevation — Augusta / Low Country vernacular.
 * Raised pier foundation, deep porch, symmetrical fenestration, hipped roof.
 */
export function LowCountryElevation({
  className,
  stroke = "currentColor",
  accent = "#b5451b",
}: LowCountryElevationProps) {
  return (
    <svg
      viewBox="0 0 480 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-full", className)}
      aria-hidden
    >
      <line x1="24" y1="268" x2="456" y2="268" stroke={stroke} strokeWidth="0.75" opacity="0.35" />
      {[72, 120, 200, 280, 360, 408].map((x) => (
        <g key={x}>
          <rect x={x - 5} y={248} width="10" height="20" stroke={stroke} strokeWidth="0.75" fill="none" opacity="0.5" />
          <line x1={x} y1={268} x2={x} y2={276} stroke={accent} strokeWidth="0.5" opacity="0.6" />
        </g>
      ))}
      <line x1="48" y1="228" x2="432" y2="228" stroke={stroke} strokeWidth="1" />
      <line x1="48" y1="248" x2="432" y2="248" stroke={stroke} strokeWidth="0.75" opacity="0.6" />
      {[72, 136, 200, 264, 328, 392].map((x) => (
        <line key={`col-${x}`} x1={x} y1="168" x2={x} y2="228" stroke={stroke} strokeWidth="1.25" />
      ))}
      <path d="M36 168 L240 128 L444 168 L444 188 L36 188 Z" stroke={stroke} strokeWidth="1" fill="none" />
      <rect x="56" y="188" width="368" height="40" stroke={stroke} strokeWidth="0.75" fill="none" opacity="0.45" />
      <rect x="56" y="108" width="368" height="80" stroke={stroke} strokeWidth="1.25" fill="none" />
      <path d="M48 108 L240 64 L432 108" stroke={stroke} strokeWidth="1.25" fill="none" />
      <rect x="368" y="72" width="28" height="36" stroke={stroke} strokeWidth="0.75" fill="none" />
      {[
        [96, 132],
        [168, 132],
        [264, 132],
        [336, 132],
      ].map(([x, y]) => (
        <g key={`win-${x}`}>
          <rect x={x} y={y} width="36" height="44" stroke={stroke} strokeWidth="0.75" fill="none" />
          <line x1={x + 18} y1={y} x2={x + 18} y2={y + 44} stroke={stroke} strokeWidth="0.5" opacity="0.5" />
        </g>
      ))}
      <rect x="214" y="148" width="52" height="60" stroke={stroke} strokeWidth="1" fill="none" />
      <rect x="222" y="120" width="36" height="20" stroke={accent} strokeWidth="0.6" fill="none" opacity="0.7" />
      <line x1="456" y1="64" x2="456" y2="268" stroke={accent} strokeWidth="0.5" opacity="0.45" strokeDasharray="4 6" />
      <line x1="450" y1="64" x2="462" y2="64" stroke={accent} strokeWidth="0.5" opacity="0.45" />
      <line x1="450" y1="268" x2="462" y2="268" stroke={accent} strokeWidth="0.5" opacity="0.45" />
    </svg>
  );
}
