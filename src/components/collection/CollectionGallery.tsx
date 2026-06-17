"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
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
      <div className="flex flex-wrap gap-2 sm:gap-0 border-b border-ink/10 mb-8 md:mb-12">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "px-5 sm:px-8 py-4 font-sans text-[11px] tracking-[0.22em] uppercase transition-colors duration-300 border-b-2 -mb-px",
              tab === t.id
                ? "border-rust text-ink"
                : "border-transparent text-ink/40 hover:text-ink/70"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative min-h-[20rem] md:min-h-[28rem] transition-opacity duration-500">
        {tab === "rendering" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            <div className="md:col-span-8 relative aspect-[4/3] md:aspect-auto md:min-h-[28rem] border border-ink/10 overflow-hidden bg-parchment">
              <Image
                src={getCollectionImage(variant)}
                alt={getCollectionImageAlt(homeName)}
                fill
                sizes="(min-width: 768px) 66vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="md:col-span-4 flex flex-col justify-center border-t md:border-t-0 md:border-l border-ink/10 pt-8 md:pt-0 md:pl-8">
              <p className="font-sans text-[11px] tracking-[0.28em] uppercase text-rust">Heritage Rendering</p>
              <h3 className="mt-4 font-display text-2xl text-ink leading-snug">{homeName}</h3>
              <p className="mt-4 text-sm text-ink/65 leading-relaxed">
                Architectural portrait composed for the Collection — proportion, material, and character documented for modern Southern living.
              </p>
            </div>
          </div>
        )}

        {tab === "construction" && (
          <div className="flex flex-col items-center justify-center min-h-[20rem] md:min-h-[28rem] border border-ink/10 bg-parchment/30 p-10 md:p-16 text-center">
            <span className="font-mono text-sm text-gold">—</span>
            <p className="mt-6 font-display text-2xl sm:text-3xl text-ink max-w-md leading-snug">
              Construction documentation begins at groundbreaking.
            </p>
            <p className="mt-4 text-sm text-ink/55 max-w-sm leading-relaxed">
              Each commissioned {homeName} receives a full construction archive — field photographs, milestone records, and craft details preserved for the Heritage Rendering system.
            </p>
          </div>
        )}

        {tab === "completed" && (
          <div className="flex flex-col items-center justify-center min-h-[20rem] md:min-h-[28rem] border border-ink/10 bg-warm-white p-10 md:p-16 text-center">
            <span className="font-mono text-sm text-gold">—</span>
            <p className="mt-6 font-display text-2xl sm:text-3xl text-ink max-w-md leading-snug">
              Completed residence photography upon delivery.
            </p>
            <p className="mt-4 text-sm text-ink/55 max-w-sm leading-relaxed">
              Every finished home enters the Collection with professional photography — interior volumes, material patina, and the home in its landscape.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
