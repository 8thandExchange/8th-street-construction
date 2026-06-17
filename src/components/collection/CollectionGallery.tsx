"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { RenderingFrame, getRenderingAspect } from "@/components/ui/RenderingFrame";
import type { CollectionVariant } from "@/lib/home-collection";
import { getCollectionImage, getCollectionImageAlt } from "@/lib/collection-images";

type GalleryTab = "rendering" | "construction" | "completed";

type CollectionGalleryProps = {
  variant: CollectionVariant;
  homeName: string;
};

const TABS: { id: GalleryTab; label: string }[] = [
  { id: "rendering", label: "Rendering" },
  { id: "construction", label: "Construction" },
  { id: "completed", label: "Completed Home" },
];

export function CollectionGallery({ variant, homeName }: CollectionGalleryProps) {
  const [tab, setTab] = useState<GalleryTab>("rendering");

  return (
    <div>
      <div className="flex overflow-x-auto scrollbar-none border-b border-ink/10 mb-6 md:mb-10 -mx-1 px-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 px-4 sm:px-8 py-3 sm:py-4 font-sans text-[10px] sm:text-[11px] tracking-[0.18em] sm:tracking-[0.22em] uppercase transition-colors duration-300 border-b-2 -mb-px",
              tab === t.id
                ? "border-rust text-ink"
                : "border-transparent text-ink/40 hover:text-ink/70"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative transition-opacity duration-500">
        {tab === "rendering" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-8">
            <div className="md:col-span-8">
              <RenderingFrame
                src={getCollectionImage(variant)}
                alt={getCollectionImageAlt(homeName)}
                aspect={getRenderingAspect(variant)}
                sizes="(min-width: 768px) 66vw, 100vw"
              />
            </div>
            <div className="md:col-span-4 flex flex-col justify-center border-t md:border-t-0 md:border-l border-ink/10 pt-6 md:pt-0 md:pl-8">
              <p className="font-sans text-[11px] tracking-[0.28em] uppercase text-rust">Heritage Rendering</p>
              <h3 className="mt-3 sm:mt-4 font-display text-xl sm:text-2xl text-ink leading-snug">{homeName}</h3>
              <p className="mt-3 sm:mt-4 text-sm text-ink/65 leading-relaxed">
                Architectural portrait composed for the Collection — proportion, material, and character documented for modern Southern living.
              </p>
            </div>
          </div>
        )}

        {tab === "construction" && (
          <div className="flex flex-col items-center justify-center min-h-[14rem] sm:min-h-[18rem] border border-ink/10 bg-parchment/30 p-8 sm:p-12 md:p-16 text-center">
            <span className="font-mono text-sm text-gold">—</span>
            <p className="mt-5 sm:mt-6 font-display text-xl sm:text-2xl md:text-3xl text-ink max-w-md leading-snug">
              Construction documentation begins at groundbreaking.
            </p>
            <p className="mt-3 sm:mt-4 text-sm text-ink/55 max-w-sm leading-relaxed">
              Each commissioned {homeName} receives a full construction archive — field photographs, milestone records, and craft details preserved for the Heritage Rendering system.
            </p>
          </div>
        )}

        {tab === "completed" && (
          <div className="flex flex-col items-center justify-center min-h-[14rem] sm:min-h-[18rem] border border-ink/10 bg-warm-white p-8 sm:p-12 md:p-16 text-center">
            <span className="font-mono text-sm text-gold">—</span>
            <p className="mt-5 sm:mt-6 font-display text-xl sm:text-2xl md:text-3xl text-ink max-w-md leading-snug">
              Completed residence photography upon delivery.
            </p>
            <p className="mt-3 sm:mt-4 text-sm text-ink/55 max-w-sm leading-relaxed">
              Every finished home enters the Collection with professional photography — interior volumes, material patina, and the home in its landscape.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
