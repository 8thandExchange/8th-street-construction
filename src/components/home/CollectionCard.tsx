import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { RenderingFrame } from "@/components/ui/RenderingFrame";
import type { CollectionHome } from "@/lib/home-collection";
import {
  getCollectionImage,
  getCollectionImageAlt,
  getCollectionDimensions,
} from "@/lib/collection-images";

type CollectionCardProps = {
  home: CollectionHome;
  index: number;
};

export function CollectionCard({ home, index }: CollectionCardProps) {
  return (
    <Reveal delay={index * 70}>
      <article className="group luxury-card h-full flex flex-col bg-warm-white border border-ink/8">
        <RenderingFrame
          src={getCollectionImage(home.id)}
          alt={getCollectionImageAlt(home.name)}
          dimensions={getCollectionDimensions(home.id)}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="border-0 border-b border-ink/8 rounded-none"
        />

        <div className="flex flex-col flex-1 p-5 sm:p-6 md:p-8">
          <h3 className="font-display text-xl sm:text-2xl text-ink leading-tight group-hover:text-rust transition-colors duration-500">
            {home.name}
          </h3>
          <p className="mt-2.5 sm:mt-3 text-sm text-ink/65 leading-relaxed flex-1">
            {home.description}
          </p>
          <Link
            href={`/collection/${home.slug}`}
            className="mt-5 sm:mt-6 inline-flex items-center gap-3 font-sans text-[11px] tracking-[0.22em] uppercase text-ink group-hover:text-rust transition-colors duration-500"
          >
            View Home
            <span className="block w-8 h-px bg-current transition-all duration-500 group-hover:w-12" aria-hidden />
          </Link>
        </div>
      </article>
    </Reveal>
  );
}
