import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import type { CollectionHome } from "@/lib/home-collection";
import { getCollectionImage, getCollectionImageAlt } from "@/lib/collection-images";

type CollectionCardProps = {
  home: CollectionHome;
  index: number;
};

export function CollectionCard({ home, index }: CollectionCardProps) {
  const portrait = getCollectionImage(home.id);

  return (
    <Reveal delay={index * 70}>
      <article className="group luxury-card h-full flex flex-col bg-warm-white border border-ink/8 overflow-hidden">
        <div className="relative aspect-[4/3] bg-parchment/30 overflow-hidden">
          <Image
            src={portrait}
            alt={getCollectionImageAlt(home.name)}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-parchment/50 via-transparent to-transparent pointer-events-none" />
        </div>

        <div className="flex flex-col flex-1 p-6 sm:p-8">
          <h3 className="font-display text-2xl sm:text-[1.75rem] text-ink leading-tight group-hover:text-rust transition-colors duration-500">
            {home.name}
          </h3>
          <p className="mt-3 text-sm text-ink/65 leading-relaxed flex-1">{home.description}</p>
          <Link
            href={`/collection/${home.slug}`}
            className="mt-6 inline-flex items-center gap-3 font-sans text-[11px] tracking-[0.22em] uppercase text-ink group-hover:text-rust transition-colors duration-500"
          >
            View Home
            <span className="block w-8 h-px bg-current transition-all duration-500 group-hover:w-12" aria-hidden />
          </Link>
        </div>
      </article>
    </Reveal>
  );
}
