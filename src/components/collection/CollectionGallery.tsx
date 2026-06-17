import { RenderingFrame } from "@/components/ui/RenderingFrame";
import type { CollectionVariant } from "@/lib/home-collection";
import { getCollectionImage, getCollectionImageAlt, getCollectionDimensions } from "@/lib/collection-images";

type CollectionGalleryProps = {
  variant: CollectionVariant;
  homeName: string;
};

/** Rendering only — construction and completed photos appear when we have them. */
export function CollectionGallery({ variant, homeName }: CollectionGalleryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-8">
      <div className="md:col-span-8">
        <RenderingFrame
          src={getCollectionImage(variant)}
          alt={getCollectionImageAlt(homeName)}
          dimensions={getCollectionDimensions(variant)}
          sizes="(min-width: 768px) 66vw, 100vw"
        />
      </div>
      <div className="md:col-span-4 flex flex-col justify-center border-t md:border-t-0 md:border-l border-ink/10 pt-6 md:pt-0 md:pl-8">
        <p className="font-sans text-[11px] tracking-[0.28em] uppercase text-rust">Heritage Rendering</p>
        <h3 className="mt-3 sm:mt-4 font-display text-xl sm:text-2xl text-ink leading-snug">{homeName}</h3>
        <p className="mt-3 sm:mt-4 text-sm text-ink/65 leading-relaxed">
          Architectural portrait composed for the Collection — proportion, material, and character
          documented for modern Southern living.
        </p>
      </div>
    </div>
  );
}
