import Image from "next/image";

/**
 * Full-bleed hero image with an imperceptibly slow drift (Ken Burns) —
 * presence without video. Motion is disabled for reduced-motion users.
 */
export function HeroStillBackground({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 hero-drift">
        <Image
          src={src}
          alt={alt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}
