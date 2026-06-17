import { cn } from "@/lib/utils";
import type { HRArchitectureVariant } from "@/lib/heritage-rendering/architecture";
import { HeritageRenderingCanvas } from "@/lib/heritage-rendering/canvas";
import { getTemplateSpec } from "@/lib/heritage-rendering/specs";
import type { HRTemplateId } from "@/lib/heritage-rendering/tokens";

export type HeritageRenderingProps = {
  variant?: HRArchitectureVariant;
  template?: HRTemplateId;
  title?: string;
  className?: string;
  framed?: boolean;
  /** @deprecated Use template prop — stroke handled by system tokens */
  stroke?: string;
  accent?: string;
  gold?: string;
};

/**
 * Heritage Rendering — unified entry point for The 8th Street Heritage Rendering System.
 * Defaults to website-hero template; pass template="collection-card" for cards, etc.
 */
export function HeritageRendering({
  variant = "hero",
  template = "website-hero",
  title,
  className,
  framed = true,
}: HeritageRenderingProps) {
  const spec = getTemplateSpec(template);
  const canvas = (
    <HeritageRenderingCanvas
      variant={variant}
      spec={spec}
      title={title}
      showFieldLabel={template !== "collection-card" && template !== "social-media-post"}
      className={cn("w-full h-full", !framed && className)}
    />
  );

  if (!framed) return canvas;

  return <div className={cn("relative h-full w-full", className)}>{canvas}</div>;
}
