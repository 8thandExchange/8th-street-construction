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
  const [mode, setMode] = useState<"loading" | "video" | "poster">("loading");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setMode("poster");
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = src;

    const showPoster = () => setMode("poster");
    const showVideo = () => setMode("video");

    video.addEventListener("loadeddata", showVideo);
    video.addEventListener("error", showPoster);
    video.load();

    return () => {
      video.removeEventListener("loadeddata", showVideo);
      video.removeEventListener("error", showPoster);
    };
  }, [src]);

  return (
    <div className={cn("absolute inset-0", className)} aria-hidden>
      {mode === "video" ? (
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
