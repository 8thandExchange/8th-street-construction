import type { HRArchitectureVariant } from "./architecture";
import { ArchitectureElevation } from "./architecture";
import type { HRTemplateSpec } from "./specs";
import {
  ParchmentBackground,
  ContourField,
  GraphiteShading,
  SouthernLandscape,
  SurveyReferences,
  ElevationAnnotations,
  ArchitecturalBorder,
  EmbossedSeal,
  TypographyBlock,
  FieldJournalLabel,
} from "./layers";

export type HeritageRenderingCanvasProps = {
  variant?: HRArchitectureVariant;
  spec: Pick<
    HRTemplateSpec,
    "border" | "landscapeDensity" | "contourDensity" | "seal" | "typography"
  >;
  title?: string;
  showFieldLabel?: boolean;
  className?: string;
};

/**
 * Core Heritage Rendering canvas — all ten required layers composed in order.
 */
export function HeritageRenderingCanvas({
  variant = "hero",
  spec,
  title,
  showFieldLabel = true,
  className,
}: HeritageRenderingCanvasProps) {
  const landscapeVariant =
    spec.landscapeDensity === "simplified" ? "simplified" : "full";

  return (
    <svg
      viewBox="0 0 480 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title ? `Heritage Rendering: ${title}` : "Heritage Rendering"}
    >
      <ParchmentBackground />
      <ContourField density={spec.contourDensity} />
      <GraphiteShading variant={landscapeVariant === "simplified" ? "simplified" : "full"} />
      <SouthernLandscape density={spec.landscapeDensity} />
      <ArchitectureElevation variant={variant} />
      <SurveyReferences />
      <ElevationAnnotations />
      <ArchitecturalBorder style={spec.border} />
      <EmbossedSeal position={spec.seal.position} size={spec.seal.size} />
      {(spec.typography.wordmark || spec.typography.taglinePrimary || spec.typography.title) && (
        <TypographyBlock
          showWordmark={spec.typography.wordmark}
          showPrimary={spec.typography.taglinePrimary}
          showSecondary={spec.typography.taglineSecondary}
          title={spec.typography.title ? title : undefined}
          align={spec.border === "formal" ? "center" : "left"}
        />
      )}
      {showFieldLabel && <FieldJournalLabel />}
    </svg>
  );
}
