import Image from "next/image";
import { cn } from "@/lib/utils";
import { SITE_TEXTURES } from "@/lib/site-images";

type TextureKind = "blueprint" | "linen";

type BrandTextureProps = {
  kind: TextureKind;
  className?: string;
  opacity?: number;
};

const TEXTURE_SRC: Record<TextureKind, string> = {
  blueprint: SITE_TEXTURES.blueprint,
  linen: SITE_TEXTURES.linen,
};

export function BrandTexture({ kind, className, opacity = 0.14 }: BrandTextureProps) {
  return (
    <div
      className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}
      aria-hidden
    >
      <Image
        src={TEXTURE_SRC[kind]}
        alt=""
        fill
        sizes="100vw"
        className="object-cover mix-blend-soft-light"
        style={{ opacity }}
      />
    </div>
  );
}
