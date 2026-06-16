import Link from "next/link";
import { cn } from "@/lib/utils";
import { ElevationMark } from "./ElevationMark";

type LogoLockupProps = {
  /** Light text on dark backgrounds (navy hero, footer) */
  variant?: "light" | "dark";
  className?: string;
  /** Render as link to home */
  href?: string;
  /** Compact for header; full includes divider + location */
  size?: "compact" | "full";
};

const STROKE = { light: "#f2ece0", dark: "#1a1a18" } as const;
const ACCENT = "#b5451b";
const MUTED = { light: "#5a6672", dark: "#6b645a" } as const;

export function LogoLockup({
  variant = "dark",
  className,
  href = "/",
  size = "compact",
}: LogoLockupProps) {
  const stroke = STROKE[variant];
  const muted = MUTED[variant];
  const primary = variant === "light" ? "text-parchment" : "text-ink";

  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 sm:gap-3 min-w-0",
        primary,
        className
      )}
    >
      <ElevationMark
        className="h-9 w-9 sm:h-10 sm:w-10"
        stroke={stroke}
        accent={ACCENT}
      />
      {size === "full" && (
        <span
          className="hidden sm:block w-px self-stretch my-1 opacity-20"
          style={{ backgroundColor: stroke }}
          aria-hidden
        />
      )}
      <span className="flex flex-col justify-center leading-none min-w-0">
        <span className="font-display font-semibold text-[14px] sm:text-[16px] tracking-[0.22em] uppercase truncate">
          8TH STREET
        </span>
        <span
          className="font-sans font-normal text-[8px] sm:text-[9px] tracking-[0.42em] uppercase mt-1 truncate"
          style={{ color: muted }}
        >
          CONSTRUCTION
        </span>
        {size === "full" && (
          <>
            <span
              className="hidden md:block h-px w-full max-w-[11rem] mt-1.5"
              style={{ backgroundColor: ACCENT }}
              aria-hidden
            />
            <span
              className="hidden md:block font-display italic text-[9px] tracking-[0.12em] mt-1"
              style={{ color: muted }}
            >
              Augusta, Georgia
            </span>
          </>
        )}
      </span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="group shrink-0 min-w-0" aria-label="8th Street Construction home">
        {content}
      </Link>
    );
  }

  return content;
}
