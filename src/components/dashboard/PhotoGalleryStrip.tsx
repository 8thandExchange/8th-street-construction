import Link from "next/link";
import Image from "next/image";
import type { DashboardPhoto } from "@/lib/data/project-dashboard";

type PhotoGalleryStripProps = {
  photos: DashboardPhoto[];
  href: string;
  title?: string;
};

export function PhotoGalleryStrip({
  photos,
  href,
  title = "From the field",
}: PhotoGalleryStripProps) {
  if (photos.length === 0) return null;

  return (
    <section className="dash-panel overflow-hidden">
      <div className="flex justify-between items-baseline px-6 pt-6 pb-4 border-b border-ink/8">
        <h3 className="font-display text-lg text-ink">{title}</h3>
        <Link href={href} className="font-mono text-[10px] uppercase text-copper hover:underline">
          All updates →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-px bg-ink/10">
        {photos.map((photo, i) => (
          <Link
            key={photo.id}
            href={href}
            className={`relative aspect-square bg-bone overflow-hidden group ${
              i === 0 ? "sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-[200px]" : ""
            }`}
          >
            <Image
              src={photo.url}
              alt={photo.caption || photo.updateTitle}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes={i === 0 ? "320px" : "160px"}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <p className="text-[10px] font-mono uppercase text-bone/70 truncate">{photo.updateTitle}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
