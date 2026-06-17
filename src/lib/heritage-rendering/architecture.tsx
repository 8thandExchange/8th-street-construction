import type { CollectionVariant } from "@/lib/home-collection";
import { HR_TOKENS } from "./tokens";

export type HRArchitectureVariant = CollectionVariant | "hero";

type ArchitectureProps = {
  variant: HRArchitectureVariant;
  ink?: string;
  rust?: string;
};

/** Black ink architectural linework — elevation study per collection variant */
export function ArchitectureElevation({
  variant,
  ink = HR_TOKENS.colors.ink,
  rust = HR_TOKENS.colors.rust,
}: ArchitectureProps) {
  const s = ink;
  const ground = 300;

  if (variant === "riverwalk") {
    return (
      <g>
        <rect x="80" y="140" width="320" height="120" stroke={s} strokeWidth="1.2" fill="none" />
        <path d="M80 140 L240 100 L400 140" stroke={s} strokeWidth="1.2" fill="none" />
        <rect x="120" y="170" width="80" height="60" stroke={s} strokeWidth="0.6" opacity="0.7" fill="none" />
        <rect x="280" y="170" width="80" height="60" stroke={s} strokeWidth="0.6" opacity="0.7" fill="none" />
        <line x1="240" y1="260" x2="240" y2={ground} stroke={s} strokeWidth="0.5" opacity="0.6" />
      </g>
    );
  }

  if (variant === "midtown" || variant === "broad") {
    return (
      <g>
        <rect x="140" y="80" width="200" height="200" stroke={s} strokeWidth="1.2" fill="none" />
        <rect x="170" y="200" width="50" height="80" stroke={s} strokeWidth="0.8" fill="none" />
        <rect x="260" y="200" width="50" height="80" stroke={s} strokeWidth="0.8" fill="none" />
        {[100, 150, 200, 250].map((y) => (
          <rect key={y} x="155" y={y} width="30" height="35" stroke={s} strokeWidth="0.5" opacity="0.65" fill="none" />
        ))}
        <line x1="140" y1="280" x2="340" y2="280" stroke={s} strokeWidth="0.8" />
      </g>
    );
  }

  if (variant === "summerville") {
    return (
      <g>
        <path d="M100 260 L240 180 L380 260 Z" stroke={s} strokeWidth="1" fill="none" />
        <rect x="130" y="200" width="220" height="60" stroke={s} strokeWidth="1" fill="none" />
        <line x1="130" y1="220" x2="350" y2="220" stroke={s} strokeWidth="0.5" opacity="0.5" />
        {[160, 220, 280].map((x) => (
          <line key={x} x1={x} y1="200" x2={x} y2="260" stroke={s} strokeWidth="0.8" />
        ))}
      </g>
    );
  }

  if (variant === "savannah") {
    return (
      <g>
        <rect x="100" y="160" width="280" height="100" stroke={s} strokeWidth="1.2" fill="none" />
        <rect x="120" y="110" width="240" height="50" stroke={s} strokeWidth="1" fill="none" />
        {[140, 200, 260, 320].map((x) => (
          <rect key={x} x={x} y="175" width="28" height="40" stroke={s} strokeWidth="0.6" fill="none" />
        ))}
        <line x1="100" y1="260" x2="380" y2="260" stroke={s} strokeWidth="0.8" />
      </g>
    );
  }

  return (
    <g>
      {[90, 150, 240, 330, 390].map((x) => (
        <line key={x} x1={x} y1="175" x2={x} y2="260" stroke={s} strokeWidth="1" />
      ))}
      <path d="M60 175 L240 130 L420 175 L420 195 L60 195 Z" stroke={s} strokeWidth="1" fill="none" />
      <rect x="80" y="195" width="320" height="65" stroke={s} strokeWidth="1.2" fill="none" />
      <path d="M70 130 L240 85 L410 130" stroke={s} strokeWidth="1.2" fill="none" />
      <rect x="210" y="215" width="60" height="70" stroke={rust} strokeWidth="0.8" opacity="0.85" fill="none" />
    </g>
  );
}
