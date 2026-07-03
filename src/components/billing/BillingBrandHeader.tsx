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
    <header className="app-card relative overflow-hidden mb-8">
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
            <p className="app-label !text-parchment/60">
              {BRAND.tagline}
            </p>
            <p className="app-label !text-parchment/40 !text-[10px] mt-1">
              {BRAND.parent}
            </p>
          </div>
        </div>
      </div>
      <div className="bg-white px-6 md:px-8 py-7 md:py-8">
        <p className="app-label !text-copper">{eyebrow}</p>
        <h2 className="mt-2 app-h1">
          {title}
        </h2>
        {projectTitle && (
          <p className="mt-2 font-medium text-ink/80">{projectTitle}</p>
        )}
        {description && (
          <p className="mt-3 text-[15px] text-ink/60 leading-relaxed max-w-2xl">{description}</p>
        )}
      </div>
    </header>
  );
}
