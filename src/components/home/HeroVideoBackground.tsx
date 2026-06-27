"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type HeroVideoBackgroundProps = {
  src: string;
  poster: string;
  posterAlt: string;
  className?: string;
};

export function HeroVideoBackground({
  src,
  poster,
  posterAlt,
  className,
}: HeroVideoBackgroundProps) {
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    setShowVideo(!reduced && !narrow);
  }, []);

  return (
    <div className={cn("absolute inset-0", className)} aria-hidden>
      {showVideo ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={poster}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={src} type="video/mp4" />
        </video>
      ) : (
        <Image
          src={poster}
          alt={posterAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      )}
    </div>
  );
}
