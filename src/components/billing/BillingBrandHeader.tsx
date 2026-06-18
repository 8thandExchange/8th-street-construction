import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/brand/assets";

type BillingBrandHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  projectTitle?: string;
};

export function BillingBrandHeader({
  eyebrow = "Client billing",
  title,
  description,
  projectTitle,
}: BillingBrandHeaderProps) {
  return (
    <header className="relative overflow-hidden border border-ink/10 mb-10">
      <div className="bg-navy px-6 md:px-8 py-7 md:py-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <Link href="/" className="shrink-0" aria-label={`${BRAND.name} home`}>
            <Image
              src="/img/logo-horizontal-navy.svg"
              alt={BRAND.name}
              width={220}
              height={52}
              className="h-11 w-auto md:h-12"
              priority
            />
          </Link>
          <div className="text-right hidden sm:block">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-parchment/50">
              {BRAND.tagline}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-parchment/35 mt-1">
              {BRAND.parent}
            </p>
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-paper via-bone/40 to-parchment px-6 md:px-8 py-8 md:py-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-copper">{eyebrow}</p>
        <h2 className="mt-2 font-display text-2xl md:text-3xl text-ink tracking-tight leading-snug">
          {title}
        </h2>
        {projectTitle && (
          <p className="mt-2 font-medium text-ink/80">{projectTitle}</p>
        )}
        {description && (
          <p className="mt-3 text-[15px] text-ink/60 leading-relaxed max-w-2xl">{description}</p>
        )}
      </div>
      <div className="h-1 bg-gradient-to-r from-copper via-copper/40 to-transparent" aria-hidden />
    </header>
  );
}
