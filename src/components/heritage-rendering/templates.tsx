import { cn } from "@/lib/utils";
import type { HRArchitectureVariant } from "@/lib/heritage-rendering/architecture";
import { HeritageRenderingCanvas } from "@/lib/heritage-rendering/canvas";
import { getTemplateSpec } from "@/lib/heritage-rendering/specs";

type TemplateBaseProps = {
  variant?: HRArchitectureVariant;
  title?: string;
  className?: string;
};

/** Website Hero — large framed elevation for homepage and collection heroes */
export function WebsiteHeroTemplate({ variant = "hero", className }: TemplateBaseProps) {
  const spec = getTemplateSpec("website-hero");
  return (
    <div
      className={cn("relative w-full luxury-frame", className)}
      style={{ aspectRatio: spec.aspectRatio }}
    >
      <HeritageRenderingCanvas variant={variant} spec={spec} showFieldLabel />
    </div>
  );
}

/** Collection Card — compact illustration for The Collection grid */
export function CollectionCardTemplate({
  variant = "hero",
  title,
  className,
}: TemplateBaseProps) {
  const spec = getTemplateSpec("collection-card");
  return (
    <div
      className={cn("relative w-full overflow-hidden", className)}
      style={{ aspectRatio: spec.aspectRatio }}
    >
      <HeritageRenderingCanvas
        variant={variant}
        spec={spec}
        title={title}
        showFieldLabel={false}
      />
    </div>
  );
}

/** Project Book Cover — portrait archive binder cover */
export function ProjectBookCoverTemplate({
  variant = "hero",
  title = "Residence Archive",
  className,
}: TemplateBaseProps) {
  const spec = getTemplateSpec("project-book-cover");
  return (
    <div
      className={cn("relative w-full bg-parchment shadow-lg", className)}
      style={{ aspectRatio: spec.aspectRatio }}
    >
      <HeritageRenderingCanvas variant={variant} spec={spec} title={title} />
    </div>
  );
}

/** Homeowner Presentation Print — landscape closeout presentation piece */
export function HomeownerPresentationTemplate({
  variant = "hero",
  title,
  className,
}: TemplateBaseProps) {
  const spec = getTemplateSpec("homeowner-presentation");
  return (
    <div
      className={cn("relative w-full bg-parchment", className)}
      style={{ aspectRatio: spec.aspectRatio }}
    >
      <HeritageRenderingCanvas variant={variant} spec={spec} title={title} />
    </div>
  );
}

/** Social Media Post — square brand channel asset */
export function SocialMediaPostTemplate({
  variant = "hero",
  className,
}: TemplateBaseProps) {
  const spec = getTemplateSpec("social-media-post");
  return (
    <div
      className={cn("relative w-full bg-parchment", className)}
      style={{ aspectRatio: spec.aspectRatio }}
    >
      <HeritageRenderingCanvas variant={variant} spec={spec} showFieldLabel={false} />
    </div>
  );
}

/** Jobsite Sign — on-site identification without parcel data */
export function JobsiteSignTemplate({
  variant = "hero",
  title,
  className,
}: TemplateBaseProps) {
  const spec = getTemplateSpec("jobsite-sign");
  return (
    <div
      className={cn(
        "relative w-full bg-parchment border-2 border-ink/15",
        className
      )}
      style={{ aspectRatio: spec.aspectRatio }}
    >
      <HeritageRenderingCanvas variant={variant} spec={spec} title={title} />
    </div>
  );
}

export {
  WebsiteHeroTemplate as WebsiteHero,
  CollectionCardTemplate as CollectionCard,
  ProjectBookCoverTemplate as ProjectBookCover,
  HomeownerPresentationTemplate as HomeownerPresentation,
  SocialMediaPostTemplate as SocialMediaPost,
  JobsiteSignTemplate as JobsiteSign,
};
