import Image from "next/image";
import { cn } from "@/lib/utils";
import type { CollectionVariant } from "@/lib/home-collection";

export type RenderingAspect = "5/4" | "4/5";

/** Matches actual portrait asset dimensions */
export const RENDERING_ASPECT: Partial<Record<CollectionVariant, RenderingAspect>> = {
  savannah: "4/5",
  riverwalk: "4/5",
  summerville: "4/5",
};

export const DEFAULT_RENDERING_ASPECT: RenderingAspect = "5/4";

export function getRenderingAspect(id?: CollectionVariant): RenderingAspect {
  if (!id) return DEFAULT_RENDERING_ASPECT;
  return RENDERING_ASPECT[id] ?? DEFAULT_RENDERING_ASPECT;
}

const ASPECT_CLASS: Record<RenderingAspect, string> = {
  "5/4": "aspect-[5/4]",
  "4/5": "aspect-[4/5]",
};

type RenderingFrameProps = {
  src: string;
  alt: string;
  aspect?: RenderingAspect;
  priority?: boolean;
  sizes?: string;
  label?: string;
  variant?: "light" | "dark";
  className?: string;
  imageClassName?: string;
};

/**
 * Displays Heritage Rendering portraits without cropping —
 * object-contain on parchment, matched to native aspect ratio.
 */
export function RenderingFrame({
  src,
  alt,
  aspect = DEFAULT_RENDERING_ASPECT,
  priority = false,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  label,
  variant = "light",
  className,
  imageClassName,
}: RenderingFrameProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        ASPECT_CLASS[aspect],
        isDark
          ? "border border-parchment/15 bg-navy-100"
          : "border border-ink/10 bg-parchment",
        className
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={cn(
          "object-contain object-center p-2 sm:p-3",
          imageClassName
        )}
      />
      <div
        className={cn(
          "absolute inset-0 ring-1 ring-inset pointer-events-none",
          isDark ? "ring-parchment/10" : "ring-ink/5"
        )}
        aria-hidden
      />
      {label && (
        <p
          className={cn(
            "absolute bottom-3 left-3 sm:bottom-4 sm:left-4 font-sans text-[8px] sm:text-[9px] tracking-[0.24em] uppercase max-w-[85%] leading-relaxed",
            isDark ? "text-parchment/50" : "text-pencil/70"
          )}
        >
          {label}
        </p>
      )}
    </div>
  );
}
