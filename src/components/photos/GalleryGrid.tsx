"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type GalleryImage = {
  id: string;
  url: string;
  caption?: string | null;
  date?: string | null;
};

/**
 * Responsive photo grid with a built-in fullscreen lightbox: tap a photo to
 * open, arrows/swipe/keyboard to navigate, Esc or ✕ to close.
 */
export function GalleryGrid({
  images,
  columns = 3,
}: {
  images: GalleryImage[];
  columns?: 2 | 3 | 4;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback(
    (delta: number) => {
      setOpenIndex((prev) =>
        prev === null ? prev : (prev + delta + images.length) % images.length
      );
    },
    [images.length]
  );

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openIndex, close, step]);

  if (!images.length) return null;

  const gridCols =
    columns === 2
      ? "grid-cols-2"
      : columns === 4
        ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
        : "grid-cols-2 md:grid-cols-3";

  const current = openIndex !== null ? images[openIndex] : null;

  return (
    <>
      <div className={`grid ${gridCols} gap-2`}>
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="group relative aspect-[4/3] overflow-hidden bg-ink/5 focus:outline-none focus:ring-2 focus:ring-copper"
            aria-label={img.caption || "Open photo"}
          >
            <Image
              src={img.url}
              alt={img.caption || "Project photo"}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      {current && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-ink/95"
          role="dialog"
          aria-modal="true"
          onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchStartX === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(dx) > 48) step(dx > 0 ? -1 : 1);
            setTouchStartX(null);
          }}
        >
          <div className="flex items-center justify-between p-4 text-bone/80">
            <span className="text-xs font-mono tracking-[0.15em] uppercase">
              {(openIndex ?? 0) + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={close}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>

          <div className="relative min-h-0 flex-1" onClick={close}>
            <Image
              src={current.url}
              alt={current.caption || "Project photo"}
              fill
              sizes="100vw"
              className="object-contain p-2 md:p-6"
              onClick={(e) => e.stopPropagation()}
              priority
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(-1);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-ink/60 text-bone hover:bg-ink/80"
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-ink/60 text-bone hover:bg-ink/80"
                  aria-label="Next photo"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          {(current.caption || current.date) && (
            <div className="p-4 text-center">
              {current.caption && (
                <p className="text-sm text-bone/90">{current.caption}</p>
              )}
              {current.date && (
                <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.15em] text-bone/50">
                  {current.date}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
