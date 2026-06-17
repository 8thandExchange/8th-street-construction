import Image from "next/image";
import { cn } from "@/lib/utils";
import type { RenderingDimensions } from "@/lib/collection-images";
import { FEATURED_RENDERING_DIMENSIONS } from "@/lib/collection-images";

export type { RenderingDimensions };

type RenderingFrameProps = {
  src: string;
  alt: string;
  dimensions?: RenderingDimensions;
  priority?: boolean;
  sizes?: string;
  label?: string;
  variant?: "light" | "dark";
  className?: string;
  imageClassName?: string;
};

/**
 * Displays Heritage Rendering portraits at native proportions —
 * full artwork visible including title, badge, and border.
 */
export function RenderingFrame({
  src,
  alt,
  dimensions = FEATURED_RENDERING_DIMENSIONS,
  priority = false,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  label,
  variant = "light",
  className,
  imageClassName,
}: RenderingFrameProps) {
  const isDark = variant === "dark";

  return (
    <figure
      className={cn(
        "relative w-full",
        isDark
          ? "border border-parchment/15 bg-navy-100"
          : "border border-ink/10 bg-parchment",
        className
      )}
    >
      <div className="p-1.5 sm:p-2">
        <div
          className="relative w-full"
          style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes={sizes}
            className={cn("object-contain object-center", imageClassName)}
          />
        </div>
      </div>
      {label && (
        <figcaption
          className={cn(
            "px-3 pb-3 sm:px-4 sm:pb-4 font-sans text-[8px] sm:text-[9px] tracking-[0.24em] uppercase leading-relaxed",
            isDark ? "text-parchment/50" : "text-pencil/70"
          )}
        >
          {label}
        </figcaption>
      )}
    </figure>
  );
}
