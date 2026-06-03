import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type PageHeroProps = {
  children: ReactNode;
  image?: string;
  imageAlt?: string;
  dark?: boolean;
  className?: string;
  imagePosition?: "center" | "top";
};

export function PageHero({
  children,
  image,
  imageAlt = "",
  dark = true,
  className,
  imagePosition = "center",
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden",
        dark ? "bg-navy text-bone" : "bg-bone text-ink",
        className
      )}
    >
      {image && (
        <>
          <Image
            src={image}
            alt={imageAlt}
            fill
            priority
            sizes="100vw"
            className={cn(
              "object-cover scale-105",
              imagePosition === "top" ? "object-top" : "object-center"
            )}
          />
          <div
            className={cn(
              "absolute inset-0",
              dark
                ? "bg-gradient-to-b from-navy/88 via-navy/72 to-navy/95"
                : "bg-gradient-to-b from-bone/90 via-bone/75 to-bone/95"
            )}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(184,111,62,0.12),transparent_55%)]" />
        </>
      )}
      {!image && dark && <div className="absolute inset-0 grain-overlay pointer-events-none" />}
      <div className="relative">{children}</div>
    </section>
  );
}
