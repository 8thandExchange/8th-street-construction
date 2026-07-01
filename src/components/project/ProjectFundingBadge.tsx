import {
  FUNDING_TYPE_SHORT,
  isHudHomeProject,
  isHabitatProject,
  type ProjectFundingType,
} from "@/lib/project/funding";

type ProjectFundingBadgeProps = {
  fundingType: ProjectFundingType | string | null | undefined;
  slug?: string | null;
  hudGrantYear?: number | null;
  size?: "sm" | "md" | "lg";
  showSubtext?: boolean;
  className?: string;
};

export function ProjectFundingBadge({
  fundingType,
  slug,
  hudGrantYear,
  size = "md",
  showSubtext = true,
  className = "",
}: ProjectFundingBadgeProps) {
  const project = { funding_type: fundingType, slug };
  const isHud = isHudHomeProject(project);
  const isHabitat = isHabitatProject(project) && !isHud;

  if (!isHud && !isHabitat && fundingType !== "private") {
    if (fundingType === "private" || !fundingType) return null;
  }

  if (fundingType === "private" || (!isHud && !isHabitat)) return null;

  const sizeClass =
    size === "lg" ? "funding-badge-lg" : size === "sm" ? "funding-badge-sm" : "funding-badge-md";

  if (isHud) {
    return (
      <span
        className={`funding-badge funding-badge-hud ${sizeClass} ${className}`}
        title="HUD HOME Investment Partnership — Augusta-Richmond County"
      >
        <span className="funding-badge-shimmer" aria-hidden />
        <span className="funding-badge-inner">
          <span className="funding-badge-icon" aria-hidden>
            ◆
          </span>
          <span className="funding-badge-text">
            <span className="funding-badge-label">HUD HOME</span>
            {showSubtext && (
              <span className="funding-badge-sub">
                ARC · CHIP{hudGrantYear ? ` · FY${hudGrantYear}` : ""}
              </span>
            )}
          </span>
        </span>
      </span>
    );
  }

  return (
    <span className={`funding-badge funding-badge-habitat ${sizeClass} ${className}`}>
      <span className="funding-badge-inner">
        <span className="funding-badge-icon habitat" aria-hidden>
          ⌂
        </span>
        <span className="funding-badge-text">
          <span className="funding-badge-label">{FUNDING_TYPE_SHORT.habitat}</span>
          {showSubtext && <span className="funding-badge-sub">Partner build</span>}
        </span>
      </span>
    </span>
  );
}

/** Inline dot for tables and compact lists */
export function FundingTypeDot({
  fundingType,
  slug,
}: {
  fundingType: ProjectFundingType | string | null | undefined;
  slug?: string | null;
}) {
  const project = { funding_type: fundingType, slug };
  if (isHudHomeProject(project)) {
    return (
      <span
        className="inline-block w-2 h-2 rounded-full bg-gradient-to-br from-amber-400 to-teal-600 ring-2 ring-amber-400/30"
        title="HUD HOME Fund"
      />
    );
  }
  if (isHabitatProject(project)) {
    return (
      <span
        className="inline-block w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-emerald-500/30"
        title="Habitat Partner"
      />
    );
  }
  return null;
}
